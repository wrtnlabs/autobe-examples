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
 * Test successful demotion of a super administrator to regular grade.
 *
 * Scenario:
 * 1. Create a new admin account (becomes regular by default)
 * 2. Create a super admin connection to perform the promotion
 * 3. Promote the new admin to super grade
 * 4. Demote the super admin back to regular grade
 * 5. Validate the response has grade='regular' and updated_at is modified
 */
export async function test_api_admin_demote_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account that will be promoted and then demoted
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdminAuth = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(targetAdminAuth);
  // Verify initial grade is 'regular'
  TestValidator.equals(
    "initial grade is regular",
    targetAdminAuth.grade,
    "regular",
  );
  // Step 2: Create a super admin connection to perform operations
  // Note: In a real test environment, there would be a seeded super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Step 3: Promote the target admin to super grade
  const promotedAdmin = await api.functional.shoppingMall.admin.admins.promote(
    superAdminConnection,
    {
      adminId: targetAdminAuth.id,
      body: {
        reason: "Test promotion for demotion test scenario",
      } satisfies IShoppingMallAdmin.IPromote,
    },
  );
  typia.assert(promotedAdmin);
  // Verify promotion was successful
  TestValidator.equals("grade after promotion", promotedAdmin.grade, "super");
  TestValidator.equals(
    "promoted admin ID matches",
    promotedAdmin.id,
    targetAdminAuth.id,
  );
  // Store the promoted admin's updated_at for comparison after demotion
  const promotedUpdatedAt = promotedAdmin.updated_at;
  // Step 4: Demote the super admin back to regular grade
  const demotedAdmin = await api.functional.shoppingMall.admin.admins.demote(
    superAdminConnection,
    {
      adminId: promotedAdmin.id,
    },
  );
  typia.assert(demotedAdmin);
  // Step 5: Validate demotion was successful
  TestValidator.equals("grade after demotion", demotedAdmin.grade, "regular");
  TestValidator.equals(
    "demoted admin ID matches",
    demotedAdmin.id,
    targetAdminAuth.id,
  );
  TestValidator.equals(
    "email unchanged",
    demotedAdmin.email,
    targetAdminAuth.email,
  );
  TestValidator.equals(
    "name unchanged",
    demotedAdmin.name,
    targetAdminAuth.name,
  );
  TestValidator.predicate(
    "updated_at was modified",
    demotedAdmin.updated_at !== promotedUpdatedAt,
  );
  TestValidator.predicate(
    "deleted_at is null",
    demotedAdmin.deleted_at === null,
  );
}
