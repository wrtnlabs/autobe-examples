import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_checkout(
  input?: DeepPartial<IShoppingMallCheckout.ICreate>,
): IShoppingMallCheckout.ICreate {
  return {
    address_id:
      input?.address_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
