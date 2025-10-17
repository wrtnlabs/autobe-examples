import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the post restoration workflow after moderation removal.
 *
 * This test validates the end-to-end post restoration process:
 *
 * 1. Member creates a community and becomes primary moderator
 * 2. Member creates a post in the community
 * 3. Moderator is registered and assigned to the community
 * 4. Moderator removes the post for rule violations
 * 5. Admin restores the post
 * 6. Verification that the post is visible again
 *
 * Note: The full appeal workflow is not tested because the removal API does not
 * return a moderation_action_id required for appeal creation.
 */
export async function test_api_post_restoration_after_moderation_appeal(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as member
  const memberRegistration = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityData = {
    code: RandomGenerator.alphabets(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Member creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Register and authenticate as moderator
  const moderatorRegistration = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorRegistration,
    });
  typia.assert(moderator);

  // Step 5: Switch back to member context and assign moderator to community
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = member.token.access;

  const moderatorAssignment = {
    moderator_id: moderator.id,
    permissions: "manage_posts,manage_comments,access_reports",
  } satisfies IRedditLikeCommunityModerator.ICreate;

  const assignedModerator: IRedditLikeCommunityModerator =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: moderatorAssignment,
      },
    );
  typia.assert(assignedModerator);

  // Step 6: Switch to moderator context and remove the post
  connection.headers.Authorization = moderator.token.access;

  const removalData = {
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    internal_notes: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikePost.IRemove;

  await api.functional.redditLike.moderator.posts.remove(connection, {
    postId: post.id,
    body: removalData,
  });

  // Step 7: Register and authenticate as admin
  const adminRegistration = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegistration,
    });
  typia.assert(admin);

  // Step 8: Admin restores the post
  const restoredPost: IRedditLikePost =
    await api.functional.redditLike.admin.posts.restore(connection, {
      postId: post.id,
    });
  typia.assert(restoredPost);

  // Step 9: Validate restoration
  TestValidator.equals(
    "restored post ID matches original",
    restoredPost.id,
    post.id,
  );
  TestValidator.equals(
    "restored post type matches",
    restoredPost.type,
    post.type,
  );
  TestValidator.equals(
    "restored post title matches",
    restoredPost.title,
    post.title,
  );
}
