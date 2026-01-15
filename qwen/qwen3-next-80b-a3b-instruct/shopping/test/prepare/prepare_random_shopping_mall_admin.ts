import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
export function prepare_random_shopping_mall_admin(
  input?: DeepPartial<IShoppingMallAdmin.ICreate>,
): IShoppingMallAdmin.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password: input?.password ?? RandomGenerator.alphaNumeric(16),
    permissions:
      input?.permissions ??
      RandomGenerator.pick([
        "admin:users:read",
        "admin:orders:edit",
        "admin:payments:delete",
        "admin:default",
      ] as const),
  };
}
