import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test that a moderator cannot delete posts outside their assigned communities.
 *
 * This scenario validates community scope restrictions for moderator deletion
 * privileges, ensuring moderators are limited to content management within
 * their designated communities. The test verifies proper authorization failures
 * when attempting to delete posts from unauthorized communities.
 *
 * Implementation Steps:
 *
 * 1. Create member account to create posts in different communities
 * 2. Create posts in various communities for scope testing
 * 3. Create moderator account with limited community assignments
 * 4. Attempt to delete posts from unauthorized communities
 * 5. Verify that deletion attempts fail with proper authorization errors
 */
export async function test_api_post_moderator_deletion_cross_community(
  connection: api.IConnection,
) {
  // Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create posts in different communities
  const communityIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const posts: ICommunityPlatformPost[] = [];
  for (const communityId of communityIds) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          post_type: "text",
          status: "published",
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Attempt to delete posts from unauthorized communities
  for (const post of posts) {
    await TestValidator.error(
      `moderator cannot delete post ${post.id} from unauthorized community ${post.community_platform_community_id}`,
      async () => {
        await api.functional.communityPlatform.moderator.posts.erase(
          connection,
          {
            postId: post.id,
          },
        );
      },
    );
  }
}
