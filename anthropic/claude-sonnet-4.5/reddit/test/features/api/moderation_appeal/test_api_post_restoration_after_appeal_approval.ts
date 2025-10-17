import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of post restoration following a successful
 * moderation appeal.
 *
 * This test validates the integration between the moderation appeal system and
 * post restoration functionality. The scenario has been adapted to work within
 * the constraints of the available API:
 *
 * 1. Create a moderator account who will handle both community creation and
 *    moderation
 * 2. Moderator creates a community
 * 3. Create a member account who will author the post
 * 4. Member creates a post in the community
 * 5. Moderator removes the post for rule violations
 * 6. Member submits an appeal challenging the post removal (with mock
 *    moderation_action_id)
 * 7. Moderator restores the post (simulating appeal approval)
 * 8. Verify the post is visible again with preserved metadata
 *
 * Note: This implementation uses separate connection instances for member and
 * moderator since the available API only provides join endpoints without login
 * functionality.
 */
export async function test_api_post_restoration_after_appeal_approval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account first
  const moderatorConnection: api.IConnection = { ...connection, headers: {} };

  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: `mod_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(moderatorConnection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates community
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(
      moderatorConnection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account with separate connection
  const memberConnection: api.IConnection = { ...connection, headers: {} };

  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Assign moderator to the community
  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignedModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignedModerator);

  // Step 5: Member creates a post
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  const postData = {
    community_id: community.id,
    type: postType,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    body:
      postType === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined,
    url: postType === "link" ? "https://example.com/article" : undefined,
    image_url:
      postType === "image" ? "https://example.com/image.jpg" : undefined,
    caption:
      postType === "image"
        ? RandomGenerator.paragraph({ sentences: 2 })
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(memberConnection, {
      body: postData,
    });
  typia.assert(post);

  // Step 6: Moderator removes the post
  const removalReasons = [
    "spam",
    "harassment",
    "misinformation",
    "off_topic",
  ] as const;
  const removalData = {
    removal_type: "community",
    reason_category: RandomGenerator.pick(removalReasons),
    reason_text: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IRedditLikePost.IRemove;

  await api.functional.redditLike.moderator.posts.remove(moderatorConnection, {
    postId: post.id,
    body: removalData,
  });

  // Step 7: Member submits an appeal with mock moderation_action_id
  const mockModerationActionId = typia.random<string & tags.Format<"uuid">>();

  const appealData = {
    moderation_action_id: mockModerationActionId,
    appeal_type: "content_removal",
    appeal_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 8,
      wordMax: 15,
    }),
  } satisfies IRedditLikeModerationAppeal.ICreate;

  const appeal: IRedditLikeModerationAppeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      memberConnection,
      {
        body: appealData,
      },
    );
  typia.assert(appeal);

  // Verify the appeal was created successfully
  TestValidator.equals(
    "appeal status should be pending",
    appeal.status,
    "pending",
  );
  TestValidator.equals(
    "appeal type should match",
    appeal.appeal_type,
    "content_removal",
  );
  TestValidator.equals(
    "appellant should be the member",
    appeal.appellant_member_id,
    member.id,
  );

  // Step 8: Moderator restores the post (simulating appeal approval)
  const restoredPost: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.restore(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(restoredPost);

  // Step 9: Verify the post has been successfully restored
  TestValidator.equals(
    "restored post ID should match original",
    restoredPost.id,
    post.id,
  );
  TestValidator.equals(
    "restored post title should match",
    restoredPost.title,
    post.title,
  );
  TestValidator.equals(
    "restored post type should match",
    restoredPost.type,
    post.type,
  );
  TestValidator.equals(
    "created_at timestamp should be preserved",
    restoredPost.created_at,
    post.created_at,
  );
}
