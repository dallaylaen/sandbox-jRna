#!/usr/bin/env perl

=head1 DESCRIPTION

This is a minimalistic single-page app written 
in Perl microframework called Neaf and jRna.

=cut

use strict;
use warnings;
use MVC::Neaf;
use JSON::MaybeXS;
use FindBin qw($Bin);

my $codec = JSON::MaybeXS->new->utf8;

neaf helper => 'json_form' => sub {
    my $req = shift;

    if (($req->header_in("Content-Type") || '') ne 'application/json') {
        die 400;
    };

    my $content = eval {
        $codec->decode( $req->body );
    };
    die 400 unless defined $content;
    # Bad - we're swallowing error here

    return $content;
};

neaf static => '/js' => "$Bin/../lib";
neaf static => '/js/3rd-party' => "$Bin/../example/3rd-party";

get '/' => sub {
    return {
        title => "Backend requests with jRna demo",
    };
}, -template => "index.html", -view => 'TT';

neaf default => {version => '3.14'}, path => '/api';

post '/api/Echo' => sub {
    my $req = shift;

    sleep 1;

    return $req->json_form;
};

neaf->load_resources(\*DATA)->run;

__DATA__

@@ index.html view=TT
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>[% title %]</title>
    <script lang="javascript" src="/js/3rd-party/jquery.js">alert("no jQuery!")</script>
    <script lang="javascript" src="/js/jRna.js"></script>
</head>
<body>
    <h1>[% title %]</h1>
    <div id="root">
        <input id="call"><input type="submit" id="send" value="send">
        <div id="result"></div>
    </div>
    <script lang="javascript">
        "use strict";

        const echo = jRna.backend( {
            url: '/api/Echo',
            method: 'POST',
        } );

        const container = new jRna()
            .output("result")
            .on_attach(function(){
                this.result("Click button to get smth...");
            })
            .input("call")
            .click("send", function() {
                this.result("Loading...");
                let me = this;
                echo({ answer: this.call() }).then(function(data) {
                    me.result("Answer: "+data.answer+"; version: "+data.version);
                });
            })
            .attach($("#root"));
    </script>
</body>
</html>

