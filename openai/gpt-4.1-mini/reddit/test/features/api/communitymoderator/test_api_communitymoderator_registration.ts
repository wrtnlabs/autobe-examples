import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test communityModerator user registration flow.
 *
 * 1. Submit a new communityModerator registration request with valid email and
 *    password.
 * 2. Verify successful response with JWT tokens.
 * 3. Confirm user record has is_email_verified set to false.
 * 4. Validate all required properties including timestamps and token fields.
 */
export async function test_api_communitymoderator_registration(
  connection: api.IConnection,
) {
  // Generate a unique, valid email for registration
  const email =
    `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
      tags.Format<"email">;
  // Prepare registration body
  const requestBody = {
    email: email,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  // Call the join API
  const response: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: requestBody,
      },
    );

  // Validate the returned response matches the type
  typia.assert(response);

  // Validate email matches request
  TestValidator.equals(
    "response email matches registration email",
    response.email,
    email,
  );

  // Validate is_email_verified is false initially
  TestValidator.equals(
    "is_email_verified is false for new user",
    response.is_email_verified,
    false,
  );

  // Validate deleted_at is null or undefined
  if (response.deleted_at !== null && response.deleted_at !== undefined) {
    throw new Error("deleted_at should be null or undefined on new user");
  }

  // Validate token structure
  typia.assert(response.token);
  const token: IAuthorizationToken = response.token;
  // Access and refresh token are strings
  TestValidator.predicate(
    "token.access is string",
    typeof token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof token.refresh === "string",
  );

  // Check expired_at and refreshable_until are valid ISO date-time strings
  typia.assert(token.expired_at);
  typia.assert(token.refreshable_until);
}
