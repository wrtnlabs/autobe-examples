import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that member registration returns properly structured JWT tokens with
 * correct expiration information.
 *
 * This test validates the complete authentication token structure returned
 * during member registration. It verifies that both access and refresh tokens
 * are provided as non-empty strings, and that their expiration timestamps are
 * properly set with the refresh token having a longer lifecycle.
 *
 * Steps:
 *
 * 1. Generate random valid member registration data
 * 2. Call member registration endpoint
 * 3. Validate response structure and member data
 * 4. Verify token object structure with typia.assert
 * 5. Confirm expired_at is set to a future time
 * 6. Confirm refreshable_until is set even further in the future
 * 7. Validate that refreshable_until > expired_at
 */
export async function test_api_member_registration_token_structure(
  connection: api.IConnection,
) {
  // Step 1: Generate random valid member registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Call member registration endpoint
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate response structure and member data
  typia.assert(member);

  // Step 4: Verify token object structure with typia.assert
  const token: IAuthorizationToken = member.token;
  typia.assert(token);

  // Step 5: Confirm expired_at is set to a future time
  const expiredAtDate = new Date(token.expired_at);
  const now = new Date();

  TestValidator.predicate(
    "expired_at represents a future time",
    expiredAtDate.getTime() > now.getTime(),
  );

  // Step 6: Confirm refreshable_until is set even further in the future
  const refreshableUntilDate = new Date(token.refreshable_until);

  TestValidator.predicate(
    "refreshable_until represents a future time",
    refreshableUntilDate.getTime() > now.getTime(),
  );

  // Step 7: Validate that refreshable_until > expired_at
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
}
