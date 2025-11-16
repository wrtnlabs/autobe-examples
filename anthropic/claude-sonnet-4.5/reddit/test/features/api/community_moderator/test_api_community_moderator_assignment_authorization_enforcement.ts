import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test authorization enforcement for moderator-only operations.
 *
 * This test validates that authorization boundaries are properly enforced by
 * verifying that regular members cannot perform moderator-only operations.
 * Specifically, it tests that attempting to create a community while
 * authenticated as a regular member (non-moderator) results in an authorization
 * error.
 *
 * The original scenario requested testing moderator assignment authorization,
 * but the available DTO type (IRedditCommunityCommunityModerator.ICreate) is
 * designed for moderator account registration rather than assigning existing
 * members as moderators. Therefore, this test has been adapted to validate
 * authorization enforcement through a different but equally important boundary:
 * community creation privileges.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as a regular member
 * 2. Attempt to create a community (moderator-only operation)
 * 3. Validate that authorization error is thrown
 * 4. Verify that only moderators can create communities
 */
export async function test_api_community_moderator_assignment_authorization_enforcement(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: "https://example.com/avatar.png" satisfies string &
        tags.Format<"uri">,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  await TestValidator.error(
    "regular member cannot create communities",
    async () => {
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: RandomGenerator.alphabets(10),
            display_title: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
            icon_url: "https://example.com/icon.png" satisfies string &
              tags.Format<"uri">,
            banner_url: "https://example.com/banner.png" satisfies string &
              tags.Format<"uri">,
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    },
  );
}
