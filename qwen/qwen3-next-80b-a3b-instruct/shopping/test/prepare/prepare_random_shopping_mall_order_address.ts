import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
export function prepare_random_shopping_mall_order_address(
  input?: DeepPartial<IShoppingMallOrderAddress.ICreate>,
): IShoppingMallOrderAddress.ICreate {
  return {
    recipientName: input?.recipientName ?? RandomGenerator.name(),
    phone: input?.phone ?? RandomGenerator.mobile(),
    addressLine1:
      input?.addressLine1 ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    addressLine2:
      input?.addressLine2 ??
      (RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 6 }),
      ]) as (string & tags.MaxLength<150>) | undefined),
    city:
      input?.city ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    region:
      input?.region ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 6 }),
    postalCode:
      input?.postalCode ??
      (typia.random<string & tags.Pattern<"^[A-Za-z0-9\s-]{1,20}$">>() satisfies string as string),
    country:
      input?.country ??
      RandomGenerator.pick([
        "United States",
        "Canada",
        "United Kingdom",
        "Germany",
        "Japan",
      ]),
    companyName:
      input?.companyName ??
      (RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
      ]) as (string & tags.MaxLength<150>) | undefined),
    isBusinessAddress:
      input?.isBusinessAddress ?? RandomGenerator.pick([true, false] as const),
    instructions:
      input?.instructions ??
      (RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 2, wordMin: 1, wordMax: 5 }),
      ]) as (string & tags.MaxLength<500>) | undefined),
    preferredDeliveryWindow:
      input?.preferredDeliveryWindow ??
      RandomGenerator.pick(["morning", "afternoon", "evening", "all-day"]),
    addressType:
      input?.addressType ??
      RandomGenerator.pick([
        "residential",
        "business",
        "pickup_point",
        "office",
        "warehouse",
        "other",
      ]),
    languageCode:
      input?.languageCode ??
      (RandomGenerator.pick([null, "en", "ko", "ja", "zh", "es", "fr"]) as
        | (string &
            tags.MinLength<2> &
            tags.MaxLength<2> &
            tags.Pattern<"^[a-z]{2}$">)
        | undefined),
    currencyCode:
      input?.currencyCode ??
      (RandomGenerator.pick([null, "USD", "KRW", "JPY", "EUR", "GBP"]) as
        | (string &
            tags.MinLength<3> &
            tags.MaxLength<3> &
            tags.Pattern<"^[A-Z]{3}$">)
        | undefined),
  };
}