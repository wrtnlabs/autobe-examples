import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test that only the post author can update their own posts through ownership
 * verification.
 *
 * This test validates the critical security requirement that post modifications
 * are restricted to the original author. It creates a community, registers two
 * separate member accounts, creates a post with the first member, then attempts
 * to update that post using the second member's authentication. The system
 * should reject this unauthorized update operation, confirming that ownership
 * enforcement prevents members from editing posts they don't own.
 *
 * Test Flow:
 *
 * 1. Create moderator and community for posts
 * 2. Create first member and their post
 * 3. Create second member account
 * 4. Attempt unauthorized update using second member's authentication
 * 5. Verify that update is rejected with authorization error
 */
export async function test_api_post_update_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community for posts
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: "https://example.com/icons/community.png",
          banner_url: "https://example.com/banners/community.jpg",
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member (post author)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = RandomGenerator.alphaNumeric(12);
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: firstMemberEmail,
      password: firstMemberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: "https://example.com/avatars/user1.png",
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(firstMember);

  // Step 4: Create post owned by first member
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create second member (unauthorized user)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = RandomGenerator.alphaNumeric(12);
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: secondMemberEmail,
      password: secondMemberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Attempt to update first member's post using second member's authentication
  // This should fail with authorization error due to ownership verification
  await TestValidator.error(
    "second member cannot update first member's post",
    async () => {
      await api.functional.redditCommunity.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
        } satisfies IRedditCommunityPost.IUpdate,
      });
    },
  );
}
