import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test moderator assignment with account creation attempt.
 *
 * This test creates a moderator and community, then attempts to assign/create
 * another moderator in the community. Due to the API structure accepting
 * IRedditCommunityCommunityModerator.ICreate (account creation fields), this
 * endpoint appears to create new moderator accounts rather than assign existing
 * members.
 *
 * Note: The original scenario requested testing "non-existent member
 * assignment" but the API structure uses account creation fields (email,
 * password, nickname) rather than member references (member_id or username),
 * making the original scenario unimplementable as described.
 *
 * Test Flow:
 *
 * 1. Create and authenticate first moderator account
 * 2. Create a community (moderator becomes the creator)
 * 3. Attempt to create/assign a second moderator to the community
 * 4. Validate the result based on actual API behavior
 */
export async function test_api_community_moderator_assignment_nonexistent_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: "127.0.0.1",
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri">,
          banner_url: "https://example.com/banner.png" satisfies string &
            tags.Format<"uri">,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Attempt to assign/create a second moderator
  // Testing with valid creation data to see actual API behavior
  const secondModerator =
    await api.functional.redditCommunity.communities.moderators.create(
      connection,
      {
        communityName: community.name,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
          nickname: RandomGenerator.name(),
          ip: "127.0.0.1",
          href: "https://example.com/assign" satisfies string &
            tags.Format<"uri">,
          referrer: "" satisfies string & tags.Format<"uri">,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModerator);

  // Validate the moderator was created successfully
  TestValidator.predicate(
    "second moderator should have valid ID",
    secondModerator.id.length > 0,
  );
  TestValidator.predicate(
    "second moderator should have username",
    secondModerator.username.length > 0,
  );
}
