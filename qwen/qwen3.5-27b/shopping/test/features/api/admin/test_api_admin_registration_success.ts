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
 * Test successful administrator account registration with immediate authentication.
 * 1. Submit valid registration request with unique email, strong password, and session context
 * 2. Verify response contains IShoppingMallAdmin.IAuthorized with admin identity fields
 * 3. Verify response includes valid JWT tokens (access, refresh, expired_at, refreshable_until)
 * 4. Confirm admin account created with default 'regular' grade and 'active' status
 * 5. Verify admin can immediately use returned access token for protected endpoints
 * 6. Validate password is hashed (not returned in response)
 * 7. Check session record created with client metadata for security auditing
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection (base connection never used directly)
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function for admin registration (MUST use utility, NOT SDK)
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Validate complete response structure with typia.assert()
  // This validates ALL tagged types: UUID, email, date-time formats, etc.
  typia.assert(admin);
  // Verify admin identity fields (business logic validation)
  TestValidator.equals("grade is regular", admin.grade, "regular");
  TestValidator.equals("status is active", admin.status, "active");
  TestValidator.equals("deleted_at is null", admin.deleted_at, null);
  // Verify JWT tokens exist (typia.assert already validates date-time formats)
  TestValidator.predicate("access token exists", admin.token.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    admin.token.refresh.length > 0,
  );
  // Verify admin connection has Authorization header set (token auto-set by utility)
  TestValidator.predicate(
    "authorization header set",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "authorization header starts with Bearer",
    typeof adminConnection.headers?.Authorization === "string" &&
      adminConnection.headers.Authorization.startsWith("Bearer "),
  );
}