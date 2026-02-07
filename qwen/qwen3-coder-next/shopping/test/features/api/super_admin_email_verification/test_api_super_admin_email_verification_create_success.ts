import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_super_admin_email_verifications_create } from "../../../generate/generate_random_shopping_mall_super_admin_email_verifications_create";
import { prepare_random_shopping_mall_super_admin_email_verification } from "../../../prepare/prepare_random_shopping_mall_super_admin_email_verification";

export async function test_api_super_admin_email_verification_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random super admin email verification request
  const body =
    typia.random<IShoppingMallSuperAdminEmailVerification.ICreate>() satisfies IShoppingMallSuperAdminEmailVerification.ICreate;
  // Create email verification token
  const result =
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      adminConnection,
      { body },
    );
  // Validate response
  typia.assert(result);
}
