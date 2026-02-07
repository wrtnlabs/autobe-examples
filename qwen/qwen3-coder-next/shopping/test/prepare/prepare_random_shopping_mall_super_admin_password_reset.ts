import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_super_admin_password_reset(
  input?: DeepPartial<IShoppingMallSuperAdminPasswordReset.ICreate> | undefined,
): IShoppingMallSuperAdminPasswordReset.ICreate {
  input;
  return {};
}
