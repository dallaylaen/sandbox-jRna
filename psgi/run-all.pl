#!/usr/bin/env perl

=head1 DESCRIPTION

Show all html exapmles in one page as iframes.

=cut

use strict;
use warnings;
use MVC::Neaf 0.27;
use FindBin qw($Bin);

neaf static => '/js' => "$Bin/../lib";
neaf static => '/js/3rd-party' => "$Bin/../example/3rd-party";
neaf static => '/ex/' => "$Bin/../example";
neaf static => '/lib' => "$Bin/../lib";

my @list;
foreach my $file ( sort glob "$Bin/../example/*.html" ) {
    my $basename = $file =~ s,.*/,,r;
    push @list, $basename;
};

neaf view => 'TT', 'TT';

get '/' => sub {
    +{
        -view     => 'TT',
        -template => 'index.html',
         title    => "Foo bar",
         list     => \@list,
     };
};

neaf->run;

__DATA__

@@ index.html view=TT
<html>
<head>
    <title>[% title %]</title>
    <script lang="javascript">
        window.onerror = function(msg) {
            document.getElementById("error").innerHTML += '<div>'+msg+'</div>';
        };
    </script>
    <script lang="javascript" src="/js/3rd-party/jquery.js">alert("no jQuery!")</script>
    <script lang="javascript" src="/js/jRna.js"></script>
    <style>
        .subpage {
            display: block;
            width: 100%;
            height: 80vh;
            border: solid blue 1px;
        }
    </style>
</head>
<div id="error"></div>
<h1>[% title %]</h1>
<div id="main">
    <select class="jrna-choose">
        <option value="" selected="1">Choose example to run</option>
        [% FOREACH item IN list %]
        <option value="/ex/[% item | html %]">[% item | html %]</option>
        [% END %]
    </select>
    <hr>
    <iframe class="jrna-iframe subpage" width="100%" height="100%">
    </iframe>
</div>

<script lang="javascript">
    const jrna = new jRna()
        .input('choose')
        .element('iframe')
        .on('choose', 'change', function () {
            this.iframe.attr('src', this.choose );
            this.iframe.onerror = window.onerror;
        })
        .attach('#main');
</script>
</html>
