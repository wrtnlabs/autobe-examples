import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalesOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sales_order(
  input?: DeepPartial<IShoppingMallSalesOrder.ICreate>,
): IShoppingMallSalesOrder.ICreate {
  return {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
  };
}
