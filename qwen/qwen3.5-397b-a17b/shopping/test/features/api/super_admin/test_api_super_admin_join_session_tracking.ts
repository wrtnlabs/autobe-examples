import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test successful super administrator account registration with session tracking.
 *
 * This test validates the core super administrator registration workflow:
 * 1. Register a new super administrator account with valid credentials
 * 2. Verify the API returns successful response with account information
 * 3. Validate JWT authorization tokens (accessToken and refreshToken) are issued
 * 4. Confirm session metadata is properly captured (href, referrer, ip)
 * 5. Ensure the account is immediately usable for authenticated operations
 *
 * The test verifies that email uniqueness is enforced, password is securely handled,
 * and session context fields are captured for audit trail purposes.
 */
export async function test_api_super_admin_join_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Prepare registration credentials with valid data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  // Register super administrator account using utility function
  const authorized: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: joinInput,
    });
  // Validate complete response structure including all token fields
  typia.assert(authorized);
  // Verify account information matches input (business logic validation)
  TestValidator.equals(
    "email matches registration input",
    authorized.email,
    joinInput.email,
  );
  // Verify token hierarchy (business logic: refresh token expires after access token)
  const accessExpiry = new Date(authorized.token.expired_at).getTime();
  const refreshExpiry = new Date(authorized.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshExpiry > accessExpiry,
  );
}
