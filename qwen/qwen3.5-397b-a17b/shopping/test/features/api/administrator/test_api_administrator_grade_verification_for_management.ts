import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test that super administrator can retrieve administrator details to verify grade
 * before performing grade management operations (promotion/demotion).
 *
 * This test validates:
 * 1. Super administrator authentication and session establishment
 * 2. Regular administrator account creation via admin join endpoint
 * 3. Administrator detail retrieval by super admin
 * 4. Grade field verification (ADMIN for regular administrators)
 * 5. Timestamp presence (created_at, updated_at) for audit trail
 * 6. deleted_at is null indicating active account eligible for management
 */
export async function test_api_administrator_grade_verification_for_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
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
  typia.assert(superAdminAuth);
  // 2. Create a regular administrator account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 3. Retrieve administrator details using super admin connection
  const adminDetails = await api.functional.shoppingMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(adminDetails);
  // 4. Verify grade field reflects ADMIN for regular administrator
  TestValidator.equals(
    "administrator grade should be ADMIN",
    adminDetails.grade,
    "ADMIN",
  );
  // 5. Verify timestamps are present for audit purposes
  // typia.assert() already validates date-time format, so we verify logical constraints
  TestValidator.predicate(
    "created_at should be valid date-time string",
    () => adminDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date-time string",
    () => adminDetails.updated_at.length > 0,
  );
  // 6. Verify deleted_at is null (account is active and eligible for management)
  TestValidator.equals(
    "deleted_at should be null for active account",
    adminDetails.deleted_at,
    null,
  );
  // 7. Verify email matches the one used during registration
  TestValidator.equals(
    "email matches registration email",
    adminDetails.email,
    adminJoinBody.email,
  );
  // 8. Verify ID matches the authenticated admin ID
  TestValidator.equals(
    "administrator ID matches",
    adminDetails.id,
    adminAuth.id,
  );
}
