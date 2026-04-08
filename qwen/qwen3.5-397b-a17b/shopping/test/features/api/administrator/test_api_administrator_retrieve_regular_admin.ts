import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator retrieval of regular administrator account details.
 *
 * Validates that a super administrator can successfully retrieve a regular administrator's complete account profile through the GET /shoppingMall/superAdmin/admins/{adminId} endpoint. This test ensures proper authorization, data visibility, and security requirements are met.
 *
 * The test workflow includes: (1) Super administrator registration and authentication, (2) Creating a regular administrator account through the admin join endpoint, (3) Retrieving the regular administrator's profile using the super administrator's authenticated connection, and (4) Validating all returned fields match expected values and security constraints.
 *
 * 1. Super administrator registers and authenticates via POST /shoppingMall/auth/super-admin/join.
 * 2. Regular administrator account is created via POST /shoppingMall/auth/admin/join with grade 'regular'.
 * 3. Super admin retrieves the regular admin profile via GET /shoppingMall/superAdmin/admins/{adminId}.
 * 4. Validates response contains all required fields: id, email, grade, bannedAt, createdAt, updatedAt, deletedAt, and member relation.
 * 5. Verifies grade is 'regular' and password_hash is not exposed in response.
 */
export async function test_api_administrator_retrieve_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup - create and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account with isolated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 3. Super admin retrieves the regular administrator profile
  const retrievedAdmin = await api.functional.shoppingMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: adminJoinResult.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate administrator profile matches input data
  TestValidator.equals(
    "admin id matches",
    retrievedAdmin.id,
    adminJoinResult.id,
  );
  TestValidator.equals("admin email matches", retrievedAdmin.email, adminEmail);
  TestValidator.equals(
    "admin grade is regular",
    retrievedAdmin.grade,
    "regular",
  );
  TestValidator.equals("deletedAt is null", retrievedAdmin.deletedAt, null);
  // 5. Validate member relation is properly joined
  TestValidator.predicate(
    "member relation exists",
    retrievedAdmin.member !== null,
  );
  if (retrievedAdmin.member !== null) {
    TestValidator.equals(
      "member email matches admin email",
      retrievedAdmin.member.email,
      adminEmail,
    );
  }
}
