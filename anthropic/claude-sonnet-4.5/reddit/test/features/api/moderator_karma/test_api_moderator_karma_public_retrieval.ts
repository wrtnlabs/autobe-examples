import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorKarma";

/**
 * Test retrieving karma statistics for a moderator as an unauthenticated guest
 * user.
 *
 * This test validates that the karma endpoint is publicly accessible and
 * returns accurate karma breakdown including post_karma, comment_karma, and
 * total_karma for any moderator identified by their username. The test verifies
 * that no authentication is required to access this information, confirming
 * that moderator karma is transparently visible to all platform users.
 *
 * This public accessibility supports community trust and transparency by
 * allowing anyone to view a moderator's reputation and contribution quality
 * metrics.
 *
 * Test Steps:
 *
 * 1. Create a moderator account to obtain a username
 * 2. Create an unauthenticated connection (no authentication headers)
 * 3. Retrieve the moderator's karma statistics using the public endpoint
 * 4. Validate the karma response structure and data types
 * 5. Confirm that the request succeeds without authentication
 */
export async function test_api_moderator_karma_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create an unauthenticated connection (guest user)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Retrieve karma statistics as unauthenticated user
  const karma: IRedditCommunityModeratorKarma =
    await api.functional.redditCommunity.moderators.karma.at(
      unauthenticatedConnection,
      {
        username: moderator.username,
      },
    );
  typia.assert(karma);

  // Step 4: Verify total_karma is sum of post_karma and comment_karma
  TestValidator.equals(
    "total_karma equals sum of post_karma and comment_karma",
    karma.total_karma,
    karma.post_karma + karma.comment_karma,
  );
}
