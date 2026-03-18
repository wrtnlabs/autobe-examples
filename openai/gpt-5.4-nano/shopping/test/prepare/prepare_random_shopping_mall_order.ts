import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate> | undefined,
): IShoppingMallOrder.ICreate {
  return {
    shopping_mall_payment_id:
      input?.shopping_mall_payment_id ??
      typia.random<string & tags.Format<"uuid">>(),
    ship_to_name: input?.ship_to_name ?? RandomGenerator.name(),
    ship_to_phone: input?.ship_to_phone ?? RandomGenerator.mobile(),
    ship_to_postal_code:
      input?.ship_to_postal_code ?? RandomGenerator.alphabets(6),
    ship_to_region: input?.ship_to_region ?? RandomGenerator.alphabets(10),
    ship_to_city: input?.ship_to_city ?? RandomGenerator.alphabets(10),
    ship_to_street_address:
      input?.ship_to_street_address ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    ship_to_detail_address:
      input?.ship_to_detail_address ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 6 }),
    shipping_instructions:
      input?.shipping_instructions !== undefined
        ? input.shipping_instructions
        : Math.random() < 0.8
          ? RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })
          : null,
  };
}
