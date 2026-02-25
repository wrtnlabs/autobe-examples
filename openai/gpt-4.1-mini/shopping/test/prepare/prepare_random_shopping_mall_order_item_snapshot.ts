import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order_item_snapshot(
  input?: DeepPartial<IShoppingMallOrderItemSnapshot.ICreate>,
): IShoppingMallOrderItemSnapshot.ICreate {
  return {
    shoppingMallOrderItemId:
      input?.shoppingMallOrderItemId ??
      typia.random<string & tags.Format<"uuid">>(),
    shoppingMallOrderId:
      input?.shoppingMallOrderId ??
      typia.random<string & tags.Format<"uuid">>(),
    productName:
      input?.productName ?? RandomGenerator.paragraph({ sentences: 1 }),
    variantSku: input?.variantSku ?? RandomGenerator.alphabets(10),
    variantOptionValues:
      input?.variantOptionValues ??
      JSON.stringify({
        color: RandomGenerator.pick(["red", "green", "blue", "black", "white"]),
        size: RandomGenerator.pick(["S", "M", "L", "XL"]),
        custom: RandomGenerator.alphabets(5),
      }),
    unitPrice: input?.unitPrice ?? typia.random<number & tags.Type<"double">>(),
    quantity: input?.quantity ?? typia.random<number & tags.Type<"int32">>(),
    itemStatus:
      input?.itemStatus ??
      RandomGenerator.pick([
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "return_requested",
      ]),
    sellerShopName: input?.sellerShopName ?? RandomGenerator.name(2),
    sellerLogoUri:
      input?.sellerLogoUri ??
      (RandomGenerator.pick([true, false])
        ? typia.random<string & tags.Format<"url">>()
        : null),
  };
}
