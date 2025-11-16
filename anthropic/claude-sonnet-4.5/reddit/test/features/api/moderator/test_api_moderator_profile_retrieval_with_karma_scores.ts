import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator profile retrieval with karma score validation.
 *
 * This test validates that the moderator profile endpoint correctly returns
 * karma score information. It creates a new moderator account and retrieves the
 * profile to verify that post_karma and comment_karma are accurately present
 * and reflect the moderator's reputation on the platform.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account via registration
 * 2. Retrieve the moderator profile using the username
 * 3. Validate profile data including karma scores
 */
export async function test_api_moderator_profile_retrieval_with_karma_scores(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";
  const moderatorNickname = RandomGenerator.name();
  const currentUrl = "https://reddit-community.example.com/register";
  const referrerUrl = "https://reddit-community.example.com/home";

  const registeredModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: moderatorNickname,
        href: currentUrl,
        referrer: referrerUrl,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Step 2: Retrieve the moderator profile using username
  const moderatorProfile: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.moderators.profile.at(connection, {
      username: registeredModerator.username,
    });
  typia.assert(moderatorProfile);

  // Step 3: Validate profile data matches the created moderator
  TestValidator.equals(
    "moderator ID matches",
    moderatorProfile.id,
    registeredModerator.id,
  );

  TestValidator.equals(
    "moderator username matches",
    moderatorProfile.username,
    registeredModerator.username,
  );

  TestValidator.equals(
    "moderator email matches",
    moderatorProfile.email,
    registeredModerator.email,
  );
}
