import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Verifies that a new member can register successfully using the
 * /auth/user/join endpoint.
 *
 * Steps:
 *
 * 1. Construct a registration payload with valid random email, strong password,
 *    current URI (href), and referrer URI
 * 2. Call api.functional.auth.user.join to register the user
 * 3. Assert that the response contains issued JWT tokens (access and refresh),
 *    profile fields, and appropriate account flags
 * 4. Confirm that access and refresh tokens are present, have non-empty values,
 *    and the expiration fields are valid ISO 8601 strings
 * 5. Check that the returned email matches the input, account is active (is_active
 *    === true), not blocked (is_blocked === false), has not been deleted
 *    (deleted_at === null/undefined), and is_email_verified reflects initial
 *    state (likely false)
 * 6. All date fields (created_at, updated_at, expired_at, refreshable_until) are
 *    valid ISO 8601 date-time strings
 * 7. Audit fields href and referrer were accepted and contextual information
 *    present if reflected in session (not directly testable here, but ensure
 *    API does not error).
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Construct registration payload
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const payload = {
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardUser.ICreate;

  // 2. Register the user
  const response = await api.functional.auth.user.join(connection, {
    body: payload,
  });
  typia.assert<IDiscussionBoardUser.IAuthorized>(response);

  // 3. Assert JWT token issuance, profile fields, and all flags
  TestValidator.predicate(
    "access token is present and non-empty",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry is ISO 8601 date-time string",
    typeof response.token.expired_at === "string" &&
      !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expiry is ISO 8601 date-time string",
    typeof response.token.refreshable_until === "string" &&
      !isNaN(Date.parse(response.token.refreshable_until)),
  );

  // 4. Check email and flags
  TestValidator.equals("returned email matches input", response.email, email);
  TestValidator.equals(
    "user is active on registration",
    response.is_active,
    true,
  );
  TestValidator.equals(
    "user is not blocked on registration",
    response.is_blocked,
    false,
  );
  TestValidator.equals(
    "user is not deleted on registration",
    response.deleted_at,
    null,
  );
  TestValidator.equals(
    "email verification status is initially false or system default",
    response.is_email_verified,
    false,
  );

  // 5. Assert created_at and updated_at are valid ISO 8601 strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof response.created_at === "string" &&
      !isNaN(Date.parse(response.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof response.updated_at === "string" &&
      !isNaN(Date.parse(response.updated_at)),
  );
  // Optional deleted_at: should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined on fresh registration",
    response.deleted_at === null || response.deleted_at === undefined,
  );
}
