#!/usr/bin/env perl

# We exploit the fact that jsdocs silently ignores unknown directives.
# So define a few @foo ... @end foo blocks
# and assume their content (if any) is always generated.

use strict;
use warnings;
# TODO Getopt

my %tags = (
    chainable => sub {
        my ($class) = $_[0] =~ /(\w+)/;
        die "No class name in chainable"
            unless $class;
        return "\@returns {$class} The object itself. Chainable.";
    },
    oneof => sub {
        return 'one of {@link jRna#attach attach}, {@link jRna#appendTo appendTo}, or {@link jRna#spawn spawn}'
    },
    jrnaid => sub {
        return '@param {string} id - name of jrna-prefixed class to attach to.';
    },
    jrnaname => sub {
        my $what = $_[0] || 'property';
        return(
            "\@param {string} [name] - name of created $what.",
            "Defaults to the id param",
        );
    },
);

my $one_of_tags = join '|', reverse sort keys %tags;
$one_of_tags = qr((?:$one_of_tags));

foreach my $fname( @ARGV ) {
    open my $read, "<", $fname;

    my ($tag, $indent, $params);
    my @out;
    while (<$read>) {
        # dumv sm
        if ($tag) {
            # skip all except @end tag
            /\@end\s+(\w+)\s*$/ or next;
            $1 eq $tag or die "Expected to close \@$tag, found \@end $2";

            push @out, map { "$indent$_\n" }
                "\@$tag $params", $tags{$tag}->($params), "\@end $tag";
            undef $tag;
        } elsif ( /^(.*?)\@($one_of_tags)\s*(.*)$/ ) {
            $indent = $1;
            $tag = $2;
            $params = $3;
        } else {
            # unchanged
            push @out, $_;
        };
    };

    if ($tag) {
        die "Unclosed tag \@$tag";
    };

    replace($fname, \@out, "orig.".time);
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
