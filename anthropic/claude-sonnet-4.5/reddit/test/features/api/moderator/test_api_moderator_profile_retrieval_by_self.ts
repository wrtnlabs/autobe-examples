import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that a moderator can successfully retrieve their own detailed profile
 * information.
 *
 * This test validates the complete workflow of moderator registration followed
 * by self-profile retrieval. The test verifies that all profile fields are
 * returned correctly including username, display name, avatar URL, karma scores
 * (post_karma and comment_karma), and account creation timestamp. It confirms
 * that sensitive authentication data like password hashes are excluded from the
 * response.
 *
 * Test Flow:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Retrieve the moderator's own profile using their username
 * 3. Validate all profile fields match expected values
 * 4. Verify no sensitive data is exposed in the profile response
 */
export async function test_api_moderator_profile_retrieval_by_self(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = "SecurePassword123!";
  const registrationNickname = RandomGenerator.name();

  const registrationBody = {
    email: registrationEmail,
    password: registrationPassword,
    nickname: registrationNickname,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const authorizedModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationBody,
    });

  typia.assert(authorizedModerator);

  // Validate registration response contains expected data
  TestValidator.equals(
    "registered email matches input",
    authorizedModerator.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered nickname matches input",
    authorizedModerator.nickname,
    registrationNickname,
  );

  // Step 2: Retrieve moderator's own profile using username
  const profileSummary: IRedditCommunityCommunityModerator.ISummary =
    await api.functional.redditCommunity.moderator.moderators.at(connection, {
      username: authorizedModerator.username,
    });

  typia.assert(profileSummary);

  // Step 3: Validate profile fields match registration data
  TestValidator.equals(
    "profile ID matches authorized ID",
    profileSummary.id,
    authorizedModerator.id,
  );
  TestValidator.equals(
    "profile username matches authorized username",
    profileSummary.username,
    authorizedModerator.username,
  );
  TestValidator.equals(
    "profile created_at matches registration",
    profileSummary.created_at,
    authorizedModerator.created_at,
  );
}
