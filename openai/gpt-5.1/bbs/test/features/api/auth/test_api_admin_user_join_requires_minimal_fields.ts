import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate that admin join works with only minimal required fields.
 *
 * This test ensures that POST /auth/adminUser/join successfully registers a new
 * administrative user when only the required fields of
 * IDiscussionBoardAdminUserJoin.IRequest are provided. Optional profile and
 * connection metadata (bio, ip) are deliberately omitted to confirm that the
 * backend correctly treats them as optional and still issues a fully functional
 * IDiscussionBoardAdminuser.IAuthorized session.
 *
 * Business steps:
 *
 * 1. Prepare a minimal IDiscussionBoardAdminUserJoin.IRequest payload with:
 *
 *    - Email (unique, valid email format)
 *    - Password (password-formatted string)
 *    - Display_name (short human-readable name)
 *    - Href (current page URL as a valid URI)
 *    - Referrer (referrer URL as a valid URI) and omit optional bio and ip
 *         completely.
 * 2. Call api.functional.auth.adminUser.join with this body and expect success.
 * 3. Validate that the response conforms to IDiscussionBoardAdminuser.IAuthorized
 *    using typia.assert.
 * 4. Assert that key business fields are correctly initialized:
 *
 *    - Email in the response matches the request email
 *    - DisplayName is non-empty and not just whitespace
 *    - LoginId is non-empty
 *    - Status is a non-empty string
 *    - EmailVerified is a boolean (typically false for fresh accounts)
 *    - Token field is present and satisfies IAuthorizationToken
 *    - CreatedAt and updatedAt are non-empty ISO date-time strings and createdAt <=
 *         updatedAt when parsed as dates.
 * 5. Rely on the presence of a valid token as evidence that the minimal account is
 *    immediately usable, instead of performing a separate login flow (no login
 *    endpoint is available in the current SDK slice).
 */
export async function test_api_admin_user_join_requires_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Construct minimal join request body with only required fields
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const requestBody = {
    email,
    password,
    display_name: RandomGenerator.name(2),
    href,
    referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  // 2. Call join endpoint with minimal body
  const output: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: requestBody,
    });

  // 3. Structural type validation of response
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(output);

  // 4. Business field validations
  // 4-1. Email must match input
  TestValidator.equals(
    "admin email matches request email",
    output.email,
    email,
  );

  // 4-2. displayName is non-empty and not whitespace-only
  TestValidator.predicate("displayName is non-empty", () => {
    return output.displayName.trim().length > 0;
  });

  // 4-3. loginId is non-empty
  TestValidator.predicate("loginId is non-empty", () => {
    return output.loginId.trim().length > 0;
  });

  // 4-4. status is a non-empty string (do not assert specific value)
  TestValidator.predicate("status is a non-empty string", () => {
    return output.status.trim().length > 0;
  });

  // 4-5. emailVerified is a boolean; typia.assert already checked type,
  // but we still validate that the field exists in a business sense by
  // reading it and asserting via predicate.
  TestValidator.predicate("emailVerified is boolean field readable", () => {
    return typeof output.emailVerified === "boolean";
  });

  // 4-6. Token object should satisfy IAuthorizationToken
  typia.assert<IAuthorizationToken>(output.token);

  // 4-7. createdAt and updatedAt should be valid non-empty date-time strings
  TestValidator.predicate(
    "createdAt is non-empty string",
    () => output.createdAt.trim().length > 0,
  );
  TestValidator.predicate(
    "updatedAt is non-empty string",
    () => output.updatedAt.trim().length > 0,
  );

  const createdTime: number = Date.parse(output.createdAt);
  const updatedTime: number = Date.parse(output.updatedAt);

  TestValidator.predicate(
    "createdAt parses to a valid timestamp",
    !Number.isNaN(createdTime),
  );
  TestValidator.predicate(
    "updatedAt parses to a valid timestamp",
    !Number.isNaN(updatedTime),
  );

  TestValidator.predicate(
    "createdAt is not after updatedAt",
    createdTime <= updatedTime,
  );
}
