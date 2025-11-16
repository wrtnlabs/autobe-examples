import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test successful moderator logout operation.
 *
 * This test validates the complete logout workflow for moderators:
 *
 * 1. Create a new moderator account via join endpoint
 * 2. Receive authentication tokens from the join response
 * 3. Execute the logout endpoint to terminate the session
 * 4. Verify the logout response contains proper moderator ID and timestamp
 * 5. Validate the logout_at timestamp is in ISO 8601 format
 * 6. Confirm the response includes a success message
 *
 * The test ensures that moderators can properly terminate their sessions and
 * that the logout operation returns all required confirmation details.
 */
export async function test_api_moderator_logout_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = typia.random<string & tags.MinLength<8>>();

  const moderatorJoinData = {
    email,
    username,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const authorizedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });

  typia.assert(authorizedModerator);

  // Validate that the authorized moderator has tokens
  TestValidator.predicate(
    "moderator authorized response should contain access token",
    authorizedModerator.token.access.length > 0,
  );

  TestValidator.predicate(
    "moderator authorized response should contain refresh token",
    authorizedModerator.token.refresh.length > 0,
  );

  // Step 2: Execute logout endpoint with authenticated connection
  const logoutResponse: ICommunityPlatformModerator.ILogoutResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.logout(
      connection,
    );

  typia.assert(logoutResponse);

  // Step 3: Validate logout response structure and content
  TestValidator.equals(
    "logout response moderator ID matches joined moderator ID",
    logoutResponse.id,
    authorizedModerator.id,
  );

  // Validate that logout_at is a valid ISO 8601 timestamp
  TestValidator.predicate(
    "logout_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      logoutResponse.logout_at,
    ),
  );

  // Validate that logout_at is a valid date
  const logoutDate = new Date(logoutResponse.logout_at);
  TestValidator.predicate(
    "logout_at should parse to valid Date object",
    !isNaN(logoutDate.getTime()),
  );

  // Validate logout message exists and is non-empty
  TestValidator.predicate(
    "logout response should contain confirmation message",
    logoutResponse.message.length > 0,
  );

  // Validate that message indicates successful logout
  TestValidator.predicate(
    "logout message should indicate success",
    logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("success"),
  );
}
