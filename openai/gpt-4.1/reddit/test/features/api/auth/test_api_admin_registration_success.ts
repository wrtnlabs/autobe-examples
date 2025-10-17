import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

/**
 * Validate successful admin registration via the /auth/admin/join endpoint.
 *
 * Steps:
 *
 * 1. Create a valid, unique ICommunityPlatformAdmin.ICreate body with a random
 *    unique "email", secure random password, and omit "superuser" (validate
 *    default false).
 * 2. Call api.functional.auth.admin.join(connection, { body }).
 * 3. Assert the result is ICommunityPlatformAdmin.IAuthorized: validate "id" is
 *    proper UUID, "email" equals input, "status" is 'active', "superuser" is
 *    false, and timestamps are correctly formatted; "deleted_at" is
 *    null/undefined.
 * 4. Assert presence and validity of token: "token" contains "access", "refresh",
 *    "expired_at", "refreshable_until", all appropriate formats.
 * 5. Optionally, confirm returned access token is set in connection.headers (side
 *    effect of function), and can be used for future requests as per admin
 *    authentication policy.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Create a unique valid email and secure password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Prepare the registration input -- omit "superuser" explicitly
  const body = { email, password } satisfies ICommunityPlatformAdmin.ICreate;
  // Call API
  const output = await api.functional.auth.admin.join(connection, { body });
  // Validate the response structure
  typia.assert<ICommunityPlatformAdmin.IAuthorized>(output);
  TestValidator.equals("admin email matches input", output.email, email);
  TestValidator.equals("admin status is active", output.status, "active");
  TestValidator.equals(
    "superuser is false by default",
    output.superuser,
    false,
  );
  TestValidator.predicate(
    "admin id is uuid",
    typeof output.id === "string" && /^[0-9a-fA-F\-]{36}$/.test(output.id),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof output.updated_at === "string" &&
      !isNaN(Date.parse(output.updated_at)),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    output.deleted_at,
    null,
  );
  // Validate token presence and structure
  typia.assert<IAuthorizationToken>(output.token);
  TestValidator.predicate(
    "access token present",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is date-time",
    typeof output.token.expired_at === "string" &&
      !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    typeof output.token.refreshable_until === "string" &&
      !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
