import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_super_admin_email_verification(
  input?:
    | DeepPartial<IShoppingMallSuperAdminEmailVerification.ICreate>
    | undefined,
): IShoppingMallSuperAdminEmailVerification.ICreate {
  input;
  return {};
}
