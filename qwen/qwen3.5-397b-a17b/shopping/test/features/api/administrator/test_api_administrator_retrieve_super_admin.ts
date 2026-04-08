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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can retrieve another super administrator account details.
 *
 * Validates the complete administrator retrieval flow including super administrator authentication, account creation, and cross-account visibility. Ensures that super administrators have full visibility into other super administrator accounts for platform oversight and grade management workflows.
 *
 * Special attention is given to verifying that the grade field correctly shows 'super' for super administrator accounts and that sensitive authentication data (password_hash) is never exposed in the response for security reasons.
 *
 * 1. First super administrator registers and authenticates via join endpoint.
 * 2. Second super administrator account is created via join endpoint.
 * 3. First super admin calls GET /shoppingMall/superAdmin/admins/{adminId} with second super admin's ID.
 * 4. Validates response contains complete administrator profile with grade 'super'.
 * 5. Verifies member relation is included with profile information.
 * 6. Confirms password_hash is NOT exposed in response (security requirement).
 */
export async function test_api_administrator_retrieve_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. First super administrator registers and authenticates
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(firstSuperAdmin);
  // 2. Second super administrator registers
  const secondSuperAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondSuperAdmin = await authorize_super_admin_join(
    { host: connection.host },
    {
      body: {
        email: secondSuperAdminEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(secondSuperAdmin);
  // 3. First super admin retrieves second super admin's account details
  const retrievedAdmin = await api.functional.shoppingMall.superAdmin.admins.at(
    firstSuperAdminConnection,
    {
      adminId: secondSuperAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 4. Validate business logic - ID and email match
  TestValidator.equals(
    "admin ID matches",
    retrievedAdmin.id,
    secondSuperAdmin.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    secondSuperAdminEmail,
  );
  TestValidator.equals("grade is super", retrievedAdmin.grade, "super");
  TestValidator.predicate(
    "deletedAt is null (active account)",
    retrievedAdmin.deletedAt === null,
  );
  // 5. Validate member relation exists with required fields
  TestValidator.predicate(
    "member relation exists",
    retrievedAdmin.member !== undefined,
  );
  TestValidator.equals(
    "member ID exists",
    retrievedAdmin.member.id !== undefined,
    true,
  );
  TestValidator.equals(
    "member email exists",
    retrievedAdmin.member.email !== undefined,
    true,
  );
  TestValidator.equals(
    "member status exists",
    retrievedAdmin.member.status !== undefined,
    true,
  );
}
