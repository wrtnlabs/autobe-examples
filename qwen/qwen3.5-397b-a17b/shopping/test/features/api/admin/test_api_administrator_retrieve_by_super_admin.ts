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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator retrieval of administrator details.
 *
 * This test validates that a super administrator can successfully retrieve
 * detailed information about another administrator account through the
 * GET /shoppingMall/superAdmin/admins/{adminId} endpoint.
 *
 * Test flow:
 * 1. Authenticate as super administrator using join endpoint
 * 2. Retrieve the super administrator's own details (using their own ID)
 * 3. Verify response contains all required fields with correct types
 * 4. Confirm grade field is properly returned for admin management decisions
 */
export async function test_api_administrator_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
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
  // Step 2: Retrieve administrator details using the authenticated super admin's ID
  const adminDetails: IShoppingMallAdmin =
    await api.functional.shoppingMall.superAdmin.admins.at(
      superAdminConnection,
      {
        adminId: superAdminAuth.id,
      },
    );
  typia.assert(adminDetails);
  // Step 3: Validate required fields exist and have correct types
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f-]{36}$/i.test(adminDetails.id),
  );
  TestValidator.predicate(
    "email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminDetails.email),
  );
  TestValidator.predicate(
    "grade is ADMIN or SUPER_ADMIN",
    adminDetails.grade === "ADMIN" || adminDetails.grade === "SUPER_ADMIN",
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof adminDetails.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof adminDetails.updated_at === "string",
  );
  // Step 4: Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    adminDetails.deleted_at,
    null,
  );
  // Step 5: Verify email matches the one used during registration
  TestValidator.equals(
    "email matches registration",
    adminDetails.email,
    superAdminAuth.email,
  );
  // Step 6: Verify grade is SUPER_ADMIN (since we registered as super admin)
  TestValidator.equals(
    "grade is SUPER_ADMIN",
    adminDetails.grade,
    "SUPER_ADMIN",
  );
}
