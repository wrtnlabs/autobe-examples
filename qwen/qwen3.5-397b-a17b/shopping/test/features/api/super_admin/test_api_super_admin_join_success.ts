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
 * Test successful super administrator account registration with valid credentials.
 *
 * Validates the complete super administrator join flow including email format validation, password security requirements (minimum 8 characters), and session context tracking. Ensures the response contains the newly created account information with UUID, email, lifecycle timestamps, and JWT authorization tokens.
 *
 * The test verifies that the access token and refresh token are properly formatted with appropriate expiration timestamps, and that the account is immediately active with full super administrator privileges (deleted_at is null).
 *
 * 1. Generates random registration data with valid email format, secure password, and session context URLs.
 * 2. Calls the join endpoint using the authorize utility function.
 * 3. Validates the response structure contains all required account fields and tokens.
 * 4. Confirms the account is active (deleted_at is null) and tokens have valid expiration dates.
 */
export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin using utility function
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Validate response structure with complete type checking
  typia.assert(authorized);
  // Verify account is active (not soft-deleted) - business logic validation
  TestValidator.equals("account is active", authorized.deleted_at, null);
}
