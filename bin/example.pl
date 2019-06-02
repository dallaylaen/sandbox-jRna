#!/usr/bin/env perl

use strict;
use warnings;
use Template;

my $title = shift
    or die "Usage: $0 'Example name' >example.file.html";
$title = "$title - jRna examples";

my $tt = Template->new();

$tt->process( \*DATA, { title => $title } );

__DATA__
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>[% title | html %]</title>
    <script lang="javascript" src="3rd-party/jquery.js"></script>
    <script lang="javascript" src="../lib/jRna.js"></script>
    <script lang="javascript" id="description">
        const descr = {"title":"[% title %]"}
    </script>
    <script lang="javascript">
        window.onerror = function(msg) {
            document.getElementById("error").innerHTML += '<div>'+msg+'</div>';
        };
    </script>
</head>
<body>
    <div id="error" style="color: red"></div>
    <h1>[% title | html %]</h1>

    <!-- initial node to attach to -->
    <div id="root">
    </div>

    <!-- the script is here -->
    <script lang="javascript" id="main">
        "use strict";
    </script>

    <!-- describe how to use the page, if needed -->
    <div id="usage">
    </div>
</body>
</html>
