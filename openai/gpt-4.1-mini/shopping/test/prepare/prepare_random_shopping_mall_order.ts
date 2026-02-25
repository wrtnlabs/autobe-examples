import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate>,
): IShoppingMallOrder.ICreate {
  return {
    orderItems: input?.orderItems
      ? input.orderItems.map((item) => ({
          shoppingMallOrderId:
            item.shoppingMallOrderId ??
            typia.random<string & tags.Format<"uuid">>(),
          shoppingMallProductVariantId:
            item.shoppingMallProductVariantId ??
            typia.random<string & tags.Format<"uuid">>(),
          quantity:
            item.quantity ??
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          status:
            item.status ??
            RandomGenerator.pick([
              "paid",
              "shipped",
              "delivered",
              "cancelled",
              "refunded",
            ] as const),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => ({
            shoppingMallOrderId: typia.random<string & tags.Format<"uuid">>(),
            shoppingMallProductVariantId: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            status: RandomGenerator.pick([
              "paid",
              "shipped",
              "delivered",
              "cancelled",
              "refunded",
            ] as const),
          }),
        ),
  };
}
