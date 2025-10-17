import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  /**
   * Happy-path member registration E2E test.
   *
   * Steps:
   *
   * 1. Generate a unique username/email/password and call POST /auth/member/join
   *    via api.functional.auth.member.join.
   * 2. Assert that the response matches ICommunityPortalMember.IAuthorized (using
   *    typia.assert).
   * 3. Validate business-level expectations with TestValidator assertions:
   *
   *    - Returned username equals requested username
   *    - Id and token fields are present and logically non-empty
   *    - Karma and created_at presence/shape are acceptable
   *
   * Note: The provided SDK only exposes the join operation for this scenario.
   * Therefore, instead of calling another authenticated-only endpoint to
   * validate token usage, this test verifies the token structure and presence
   * (access/refresh/expired timestamps) as a practical proof that credentials
   * were issued. This rewrite is necessary to make the test implementable with
   * the available API functions.
   */

  // 1) Prepare unique registration payload
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();

  const requestBody = {
    username,
    email,
    password,
    display_name,
  } satisfies ICommunityPortalMember.ICreate;

  // 2) Call the API to register the member
  const authorized: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: requestBody,
    });

  // 3) Type-level validation of the response
  typia.assert(authorized);

  // 4) Business validations using TestValidator
  // Ensure returned username matches input (actual-first, expected-second pattern)
  TestValidator.equals(
    "returned username matches request",
    authorized.username,
    username,
  );

  // ID presence (typia.assert already validated UUID format). Here assert presence.
  TestValidator.predicate(
    "returned id is present",
    authorized.id !== undefined &&
      authorized.id !== null &&
      typeof authorized.id === "string" &&
      authorized.id.length > 0,
  );

  // Token structure presence checks (access / refresh / timestamps are present and non-empty)
  TestValidator.predicate(
    "access token is present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is present",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until is present",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // Karma field: allowed to be undefined or a number. If present, it should be an int-like number.
  TestValidator.predicate(
    "karma is number or undefined",
    authorized.karma === undefined || typeof authorized.karma === "number",
  );

  // created_at if present must be a non-empty string (typia.assert already asserted date-time format)
  TestValidator.predicate(
    "created_at is present or undefined",
    authorized.created_at === undefined ||
      (typeof authorized.created_at === "string" &&
        authorized.created_at.length > 0),
  );

  // NOTE: We do NOT access or mutate connection.headers. The SDK sets Authorization
  // internally upon successful join. Because no other authenticated endpoint
  // is available in the provided SDK materials, token presence/shape assertions
  // serve as the feasible verification of credential issuance.
}
