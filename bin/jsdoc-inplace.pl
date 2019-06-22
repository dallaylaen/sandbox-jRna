#!/usr/bin/env perl

# We exploit the fact that jsdocs silently ignores unknown directives.
# So define a few @foo ... @end foo blocks
# and assume their content (if any) is always generated.

use strict;
use warnings;
# TODO Getopt

my %known;

my $re_bare = qr([\w\.]+);
my $re_quot = qr('(?:[^']+|\\')*');
my $re_quod = qr("(?:[^"]+|\\")*");
my $re_parm = qr($re_bare|$re_quot|$re_quod);

foreach my $fname( @ARGV ) {
    open my $read, "<", $fname;

    %known = ();
    my $one_of_tags = qr/.^/; ## impossible
    my $tag; # tag/marco being processed
    my ($create, $indent, @names, @template);
    my @out;
    while (<$read>) {
        # a dumb fsm
        if (/\@end\s+(\w+)/ and $tag) {
            die "\@end $1 found where \@end $tag expected"
                unless $1 eq $tag;
            $one_of_tags = add_macro( $tag, \@template, \@names)
                if $create;
            undef $tag;
            undef $create;
        } elsif ($tag) {
            next unless $create;
            push @template, s/^\Q$indent\E//r;
        } elsif (/^(\W*)\@macro\s+(\w+\b)(.*)/) {
            $create = 1;
            $indent = $1;
            $tag    = $2;
            @names  = $3 =~ /(\w+)/g;
            @template = ();
        } elsif (/^(\W*)\@($one_of_tags)\s*(.*)$/) {
            my $ind   = $1;
               $tag   = $2;
            my $input = $3;

            push @out, $_;
            push @out, map { "$ind$_" } expand_macro( $tag, $input );

            next;
        } else {
            # unchanged
        };
        push @out, $_;
    };

    if ($tag) {
        die "Unclosed tag \@$tag";
    };

    replace($fname, \@out, "orig.".time);
};

sub add_macro {
    my ($tag, $template, $params) = @_;

    die "Attempt to create duplicate macro $tag"
        if $known{$tag};
    $known{$tag} = [ [ @$template ], [ @$params ] ];

    # use Data::Dumper;
    # warn "Updating known: ".Dumper(\%known);

    my $upd = compile_regex( keys %known );
    # warn "Updating regex: $upd";
    return $upd;
};

sub expand_macro {
    my ($tag, $input) = @_;

    my $todo = $known{$tag}
        or die "Unknown macro $tag";

    my ($tpl, $args) = @$todo;

    my %param;
    @param{@$args} = unparam( $input, scalar @$args );
    # TODO count, #TODO allow strings or smth

    my $rex = compile_regex( @$args );
    
    return map {
        s/%\(($rex)\)/$param{$1}/gr
    } @$tpl;
};

sub unparam {
    my ($args, $count) = @_;

    my @found = $args =~ /($re_parm)/g;
    # TODO make sure nothing but re_parm is there
    die "Wrong argument count (exp $count): $args"
        if @found != $count;

    return map {
        /^["']/ 
            ? s/^["']//r =~ s/['"]$//r =~ s/\\(.)/$1/gr
            : $_
    } @found;
};

sub compile_regex {
    my $regex = join '|', map { "\Q$_\E" } reverse sort @_;
    # warn "Create regex ($regex)";
    return qr((?:$regex));
};

sub replace {
    my ($fname, $out, $suffix) = @_;
    $suffix ||= 'orig';

    my $backup = "$fname.$suffix";

    unlink $backup or $!{ENOENT}
        or die "Failed to unlink $backup: $!";
    rename $fname, $backup
        or die "Failed to rename: $!";
    open my $write, ">", $fname
        or die "Failed to open(w) $fname: $!";
    print $write join '', @$out
        or die "Failed to write $fname: $!";
    close $write
        or die "Failed to sync $fname: $!";
    # TODO unlink $fname.orig
};
