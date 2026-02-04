import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
export function prepare_random_shopping_mall_super_admin_email_verification(
  input?: DeepPartial<IShoppingMallSuperAdminEmailVerification.ICreate>,
): IShoppingMallSuperAdminEmailVerification.ICreate {
  return {};
}
