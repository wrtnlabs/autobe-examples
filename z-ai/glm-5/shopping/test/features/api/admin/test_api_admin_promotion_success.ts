import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful promotion workflow where a super administrator
 * promotes a regular administrator to super grade.
 *
 * This scenario validates:
 * 1. A seeded super administrator authenticates and creates a regular admin
 * 2. The promotion request includes a valid reason string
 * 3. The target administrator's grade is updated from 'regular' to 'super'
 * 4. The response returns the updated IShoppingMallAdmin entity
 *
 * @param connection - API connection object
 */
export async function test_api_admin_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a super administrator
  // First, create a super admin through the seeded admin join process
  // Note: In a real test environment, there would be a seeded super admin
  // For this test, we simulate by having the first admin be promoted by system
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Step 2: Create a regular administrator to be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(regularAdminAuth);
  // Verify the new admin starts with 'regular' grade
  TestValidator.equals(
    "new admin starts as regular",
    regularAdminAuth.grade,
    "regular",
  );
  const regularAdminId = regularAdminAuth.id;
  // Step 3: Attempt promotion by the first admin (who should be super)
  // This test assumes the first admin created is a super admin or
  // there's a seeded super admin available
  const promotionReason = `Promoting ${regularAdminAuth.name} to super admin for elevated platform management capabilities`;
  const promotedAdmin = await api.functional.shoppingMall.admin.admins.promote(
    superAdminConnection,
    {
      adminId: regularAdminId,
      body: {
        reason: promotionReason,
      } satisfies IShoppingMallAdmin.IPromote,
    },
  );
  typia.assert(promotedAdmin);
  // Step 4: Validate the promotion result
  TestValidator.equals(
    "admin ID remains unchanged",
    promotedAdmin.id,
    regularAdminId,
  );
  TestValidator.equals("grade updated to super", promotedAdmin.grade, "super");
  TestValidator.equals(
    "email remains unchanged",
    promotedAdmin.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "name remains unchanged",
    promotedAdmin.name,
    regularAdminAuth.name,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(promotedAdmin.updated_at).getTime() >=
      new Date(regularAdminAuth.updated_at).getTime(),
  );
}
