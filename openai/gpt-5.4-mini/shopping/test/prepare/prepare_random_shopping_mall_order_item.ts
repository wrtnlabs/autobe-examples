import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order_item(
  input?: DeepPartial<IShoppingMallOrderItem.ICreate> | undefined,
): IShoppingMallOrderItem.ICreate {
  return {
    shoppingMallOrderId:
      input?.shoppingMallOrderId ??
      typia.random<string & tags.Format<"uuid">>(),
    shoppingMallProductVariantId:
      input?.shoppingMallProductVariantId ??
      typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
