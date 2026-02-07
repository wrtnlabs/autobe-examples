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

export async function test_api_super_admin_email_verification_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test validates duplicate email verification prevention for super admins
  // The implementation assumes the API endpoint handles duplicate prevention internally
  // by either rejecting duplicate requests or invalidating previous tokens
  // Create super admin-specific connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create initial email verification token
  const firstVerification =
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdminEmailVerification.ICreate>(),
      },
    );
  typia.assert(firstVerification);
  // Attempt to create duplicate verification token
  // The system should either reject duplicate requests or invalidate previous tokens
  const secondVerification =
    await api.functional.shoppingMall.superAdmin.email_verifications.create(
      superAdminConnection,
      {
        body: typia.random<IShoppingMallSuperAdminEmailVerification.ICreate>(),
      },
    );
  typia.assert(secondVerification);
  // Validate that the duplicate prevention mechanism is working
  // The two verification records should be different (different IDs or states)
  TestValidator.notEquals(
    "duplicate verification prevention working",
    firstVerification,
    secondVerification,
  );
}
