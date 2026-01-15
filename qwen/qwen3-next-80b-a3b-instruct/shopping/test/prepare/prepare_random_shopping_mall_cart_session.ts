import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";
export function prepare_random_shopping_mall_cart_session(
  input?: DeepPartial<IShoppingMallCartSession.ICreate> | undefined,
): IShoppingMallCartSession.ICreate {
  return {};
}
