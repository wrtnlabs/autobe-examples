import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate>,
): IShoppingMallOrder.ICreate {
  return {
    payment_method_id:
      input?.payment_method_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
