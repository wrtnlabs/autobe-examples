import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful promotion of a regular administrator to super administrator grade.
 *
 * Test Flow:
 * 1. Create a super administrator via seeded test infrastructure (assumed available)
 * 2. Create a regular administrator account to be promoted
 * 3. Super administrator promotes the regular administrator with confirmation
 * 4. Validate the promotion response and grade transition
 *
 * Note: This test assumes the test environment provides a way to obtain
 * super administrator credentials (e.g., seeded admin, test fixture, or
 * bootstrap mechanism). In production, super admins are created through
 * promotion by existing super admins.
 */
export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create/get a super administrator connection
  // For bootstrapping, we assume test environment provides super admin access
  // In a real test setup, this would use seeded credentials or a test fixture
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Bootstrap: Create an admin that will act as super admin
  // Note: In actual test environment, this should use seeded super admin credentials
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a regular administrator to be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://test.example.com/admin",
        referrer: "https://test.example.com",
      },
    },
  );
  typia.assert(regularAdminAuth);
  // Verify the new admin has 'regular' grade
  TestValidator.equals(
    "new admin grade is regular",
    regularAdminAuth.grade,
    "regular",
  );
  // Store original data for validation
  const regularAdminId = regularAdminAuth.id;
  const regularAdminEmail = regularAdminAuth.email;
  const originalUpdatedAt = regularAdminAuth.updated_at;
  // 3. Super administrator promotes the regular administrator
  const promotedAdmin =
    await api.functional.shoppingMall.administrator.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdminId,
        body: {
          confirmation: true,
        } satisfies IShoppingMallAdministrator.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Validate the promotion results
  TestValidator.equals(
    "id remains unchanged",
    promotedAdmin.id,
    regularAdminId,
  );
  TestValidator.equals(
    "email remains unchanged",
    promotedAdmin.email,
    regularAdminEmail,
  );
  TestValidator.equals("grade changed to super", promotedAdmin.grade, "super");
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(promotedAdmin.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  TestValidator.equals("deleted_at is null", promotedAdmin.deleted_at, null);
}
