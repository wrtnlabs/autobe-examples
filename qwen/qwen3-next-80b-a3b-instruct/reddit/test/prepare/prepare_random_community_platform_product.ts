import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
export function prepare_random_community_platform_product(
  input?: DeepPartial<ICommunityPlatformProduct.ICreate>,
): ICommunityPlatformProduct.ICreate {
  return {
    code:
      input?.code ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<15>
        >(),
      ),
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 4,
        wordMax: 8,
      }),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
    prices: input?.prices
      ? input.prices.map((price) => ({
          product_code:
            price.product_code ??
            input?.code ??
            RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<8> &
                  tags.Maximum<15>
              >(),
            ),
          currency_code:
            price.currency_code ??
            typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
          amount:
            price.amount ??
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1> &
                tags.Maximum<999999>
            >(),
          effective_from: price.effective_from ?? new Date().toISOString(),
          effective_to:
            price.effective_to ??
            (Math.random() > 0.3
              ? new Date(Date.now() + 86400000 * 30).toISOString()
              : null),
          quantity_min:
            price.quantity_min ??
            (Math.random() > 0.5
              ? typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> &
                    tags.Maximum<100>
                >()
              : undefined),
          quantity_max:
            price.quantity_max ??
            (Math.random() > 0.5
              ? typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<0> &
                    tags.Maximum<500>
                >()
              : null),
          notes:
            price.notes ??
            (Math.random() > 0.7
              ? RandomGenerator.paragraph({ sentences: 1 })
              : undefined),
          source:
            price.source ??
            RandomGenerator.pick([
              "ManualEntry",
              "SupplierFeed",
              "MarketplaceSync",
              "CompetitorPriceScan",
            ] as const),
          region:
            price.region ??
            (Math.random() > 0.5
              ? RandomGenerator.pick([
                  "North America",
                  "Europe",
                  "Asia-Pacific",
                  "Global",
                ] as const)
              : undefined),
          price_type:
            price.price_type ??
            RandomGenerator.pick([
              "retail",
              "wholesale",
              "bulk",
              "membership",
              "promotional",
              "clearance",
            ] as const),
          tax_rate:
            price.tax_rate ??
            (Math.random() > 0.4
              ? typia.random<
                  number &
                    tags.Type<"float"> &
                    tags.Minimum<0> &
                    tags.Maximum<0.3>
                >()
              : undefined),
          unit:
            price.unit ??
            (Math.random() > 0.6
              ? RandomGenerator.pick([
                  "per item",
                  "per kg",
                  "per hour",
                  "per bundle",
                  "per 10 units",
                ] as const)
              : undefined),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            product_code:
              input?.code ??
              RandomGenerator.alphaNumeric(
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<8> &
                    tags.Maximum<15>
                >(),
              ),
            currency_code: typia.random<string & tags.Pattern<"^[A-Z]{3}$">>(),
            amount: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1> &
                tags.Maximum<999999>
            >(),
            effective_from: new Date().toISOString(),
            effective_to:
              Math.random() > 0.3
                ? new Date(Date.now() + 86400000 * 30).toISOString()
                : null,
            quantity_min:
              Math.random() > 0.5
                ? typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<100>
                  >()
                : undefined,
            quantity_max:
              Math.random() > 0.5
                ? typia.random<
                    number &
                      tags.Type<"int32"> &
                      tags.Minimum<0> &
                      tags.Maximum<500>
                  >()
                : null,
            notes:
              Math.random() > 0.7
                ? RandomGenerator.paragraph({ sentences: 1 })
                : undefined,
            source: RandomGenerator.pick([
              "ManualEntry",
              "SupplierFeed",
              "MarketplaceSync",
              "CompetitorPriceScan",
            ] as const),
            region:
              Math.random() > 0.5
                ? RandomGenerator.pick([
                    "North America",
                    "Europe",
                    "Asia-Pacific",
                    "Global",
                  ] as const)
                : undefined,
            price_type: RandomGenerator.pick([
              "retail",
              "wholesale",
              "bulk",
              "membership",
              "promotional",
              "clearance",
            ] as const),
            tax_rate:
              Math.random() > 0.4
                ? typia.random<
                    number &
                      tags.Type<"float"> &
                      tags.Minimum<0> &
                      tags.Maximum<0.3>
                  >()
                : undefined,
            unit:
              Math.random() > 0.6
                ? RandomGenerator.pick([
                    "per item",
                    "per kg",
                    "per hour",
                    "per bundle",
                    "per 10 units",
                  ] as const)
                : undefined,
          }),
        ),
    images: input?.images
      ? input.images.map((image) => ({
          productCode:
            image.productCode ??
            input?.code ??
            RandomGenerator.alphaNumeric(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<8> &
                  tags.Maximum<15>
              >(),
            ),
          name:
            image.name ??
            RandomGenerator.paragraph({ sentences: 1 }).slice(0, 100),
          extension:
            image.extension ??
            RandomGenerator.pick([
              "jpg",
              "png",
              "webp",
              "jpeg",
              "gif",
            ] as const),
          url:
            image.url ??
            `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.${image.extension}`,
          is_primary: image.is_primary ?? false,
          alt_text:
            image.alt_text ??
            RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
          order:
            image.order ??
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999>
            >(),
        }))
      : Math.random() > 0.3
        ? ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
            >(),
            () => ({
              productCode:
                input?.code ??
                RandomGenerator.alphaNumeric(
                  typia.random<
                    number &
                      tags.Type<"uint32"> &
                      tags.Minimum<8> &
                      tags.Maximum<15>
                  >(),
                ),
              name: RandomGenerator.paragraph({ sentences: 1 }).slice(0, 100),
              extension: RandomGenerator.pick([
                "jpg",
                "png",
                "webp",
                "jpeg",
                "gif",
              ] as const),
              url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.${RandomGenerator.pick(["jpg", "png", "webp", "jpeg", "gif"] as const)}`,
              is_primary: false,
              alt_text: RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 3,
                wordMax: 6,
              }),
              order: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<0> &
                  tags.Maximum<9999>
              >(),
            }),
          )
        : undefined,
  };
}
