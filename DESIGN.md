---
name: The Vinity
description: A pink and purple perfume storefront with a photographic campaign and a quiet catalog.
colors:
  primary: "#682879"
  primary-deep: "#4c1b60"
  plum: "#301338"
  rose: "#f7c6e3"
  rose-paper: "#f9e9f2"
  lilac: "#f1e5f5"
  paper: "#faf5fb"
  white: "#fffcff"
  muted-ink: "#6b4a70"
  divider: "#d9c4df"
  field-line: "#96729e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(48px, 6.3vw, 96px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  control: "8px"
  card: "14px"
spacing:
  tight: "8px"
  section: "clamp(40px, 6vw, 86px)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
    height: "44px"
  button-campaign:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.plum}"
    rounded: "{rounded.control}"
    height: "51px"
  catalog-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.plum}"
    rounded: "{rounded.card}"
---

## Overview

The Vinity pairs the visual scale of a fragrance campaign with an easy-to-browse shop. The opening composition puts a real bottle photograph on a studio set of silk, stone, and orchids. Buying, tracking, support, and staff tools share the palette and use quieter surfaces.

## Colors

Plum carries the hero, order guide, footer, and sign-in brand panels. Rose marks the hero action. Purple marks selection and primary transaction buttons on light surfaces. Rose paper and lilac distinguish collection photography. Use field-line for interactive field outlines and divider for decoration.

## Typography

Fraunces sets the brand, large headings, and product names. Italic pink appears in the campaign title. DM Sans carries navigation, inventory details, forms, and prices.

## Layout

The storefront uses a 1240px maximum content width. The hero and order guide span the viewport. The catalog groups products beneath one search and filter area. Use three catalog columns on desktop and two on narrow screens. The hero stacks with its action first on phones.

## Elevation & Depth

Ground the hero bottle on the photographed plinth with a contact shadow. Give catalog cutouts a restrained shadow and keep cards flat. Use an overlay behind dialogs to make the active task clear.

## Shapes

Controls have 8px corners and larger cards and dialogs have 14px corners. Pills indicate scent filters and order status.

## Components

Show availability and price in every product card. Search, filters, and order controls respond immediately. The studio image enters once with a short scale and fade, while pointer presses get brief feedback. Reduced motion removes movement.

## Do's and Don'ts

- Use the shop’s actual bottle cutouts and current catalog data.
- Reserve the strongest color and imagery for the campaign and the primary action.
- Use clear field borders, accessible focus rings, and readable copy on all backgrounds.
