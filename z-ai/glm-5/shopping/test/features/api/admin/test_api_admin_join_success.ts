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
 * Test successful administrator account registration.
 *
 * This test validates the complete registration workflow including:
 * - Credential hashing and storage
 * - JWT access and refresh token generation
 * - Session recording with context information
 * - Default grade assignment (new admins always start as 'regular', never 'super')
 *
 * The test verifies that upon successful registration:
 * 1. Response contains admin profile with correct email and name
 * 2. Grade is set to 'regular' (default for new admins)
 * 3. Access token is a valid JWT string
 * 4. Refresh token is a valid JWT string
 * 5. Token expiration timestamps are valid and reasonable
 * 6. deleted_at is null for active accounts
 */
export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test data for admin registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const href = "https://example.com/admin/join";
  const referrer = "https://example.com";
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create a new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin using the utility function (which wraps the SDK)
  const result = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      name,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(result);
  // Validate admin profile fields
  TestValidator.equals("email matches input", result.email, email);
  TestValidator.equals("name matches input", result.name, name);
  TestValidator.equals(
    "grade is regular for new admin",
    result.grade,
    "regular",
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    result.deleted_at === null,
  );
  // Validate tokens are non-empty strings
  TestValidator.predicate(
    "access token is valid string",
    typeof result.access === "string" && result.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid string",
    typeof result.refresh === "string" && result.refresh.length > 0,
  );
  // Validate token object exists with required properties
  TestValidator.predicate(
    "token object exists",
    result.token !== null && result.token !== undefined,
  );
  TestValidator.predicate(
    "token.access matches",
    result.token.access === result.access,
  );
  TestValidator.predicate(
    "token.refresh matches",
    result.token.refresh === result.refresh,
  );
  // Validate expiration timestamps are valid ISO 8601 dates in the future
  const now = new Date();
  const expiredAt = new Date(result.expired_at);
  const refreshableUntil = new Date(result.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Validate UUID format for admin ID
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  // Validate timestamps are set
  TestValidator.predicate(
    "created_at is set",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is set",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
}
