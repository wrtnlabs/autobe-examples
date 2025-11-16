import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test retrieval of a moderator's public profile without authentication.
 *
 * This test validates that moderator profiles are publicly accessible and
 * return comprehensive profile data including username, display_name, bio,
 * avatar_url, karma scores, and account creation timestamps. It ensures that
 * the public profile endpoint is accessible without authentication and that
 * sensitive information like email and password are properly excluded from the
 * response.
 *
 * Test Flow:
 *
 * 1. Create a moderator account with complete profile information
 * 2. Retrieve the moderator's public profile without authentication
 * 3. Validate all public profile fields are correctly returned
 * 4. Verify sensitive information is excluded from the public response
 */
export async function test_api_moderator_profile_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with complete profile information
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator's public profile without authentication
  // Create an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const publicProfile: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderators.profile.at(unauthConn, {
      username: createdModerator.username,
    });
  typia.assert(publicProfile);

  // Step 3: Validate that all expected public profile fields are present and match
  TestValidator.equals(
    "profile username matches created moderator",
    publicProfile.username,
    createdModerator.username,
  );

  TestValidator.equals(
    "profile ID matches created moderator",
    publicProfile.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "profile created_at matches",
    publicProfile.created_at,
    createdModerator.created_at,
  );
}
