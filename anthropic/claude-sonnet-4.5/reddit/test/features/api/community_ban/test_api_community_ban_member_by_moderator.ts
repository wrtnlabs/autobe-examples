import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of a community moderator issuing a ban to a
 * disruptive member.
 *
 * This test validates the moderation workflow where a moderator with
 * manage_users permission issues a temporary ban to a member who has
 * participated in the community. The test ensures proper authorization, ban
 * record creation, and metadata accuracy.
 *
 * Steps:
 *
 * 1. Create community creator member and establish community
 * 2. Create target member account and have them post in community
 * 3. Create moderator account (final auth state)
 * 4. Assign moderator to community with manage_users permission
 * 5. Moderator issues 7-day temporary ban with violation reason
 * 6. Validate ban record with correct expiration, status, and metadata
 */
export async function test_api_community_ban_member_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community creator member account
  const communityCreator = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(communityCreator);

  // Step 2: Create the community (as community creator)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "general",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create target member account who will be banned
  const targetMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(targetMember);

  // Step 4: Target member creates a post in the community to establish participation
  const memberPost = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(memberPost);

  // Step 5: Create moderator account (this sets final authentication state)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Assign moderator to community with manage_users permission
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_users",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 7: Moderator issues a 7-day temporary ban to the target member
  const banExpirationDate = new Date();
  banExpirationDate.setDate(banExpirationDate.getDate() + 7);

  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: {
        banned_member_id: targetMember.id,
        ban_reason_category: "harassment",
        ban_reason_text: "Repeated violations of community harassment policy",
        is_permanent: false,
        expiration_date: banExpirationDate.toISOString(),
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  // Step 8: Validate ban record properties
  TestValidator.equals(
    "banned member ID matches",
    ban.banned_member_id,
    targetMember.id,
  );
  TestValidator.equals("community ID matches", ban.community_id, community.id);
  TestValidator.equals(
    "ban reason category",
    ban.ban_reason_category,
    "harassment",
  );
  TestValidator.equals(
    "ban reason text",
    ban.ban_reason_text,
    "Repeated violations of community harassment policy",
  );
  TestValidator.equals("ban is not permanent", ban.is_permanent, false);
  TestValidator.equals("ban is active", ban.is_active, true);
  TestValidator.predicate(
    "ban has expiration date",
    ban.expiration_date !== null && ban.expiration_date !== undefined,
  );
}
