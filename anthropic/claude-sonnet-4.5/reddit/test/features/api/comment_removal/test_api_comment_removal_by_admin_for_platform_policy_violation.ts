import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator comment removal workflow for platform-wide policy
 * violations.
 *
 * This test validates the complete workflow for platform administrators to
 * remove comments that violate platform-wide policies. The test creates an
 * administrator account, a member account, a community, a post, and a comment
 * that violates platform policies. The administrator then removes the comment
 * with platform-level removal scope.
 *
 * Verification steps:
 *
 * 1. Administrator account is created successfully
 * 2. Member account is created successfully
 * 3. Community is created by the member
 * 4. Post is created within the community
 * 5. Comment is created on the post
 * 6. Administrator removes the comment for platform policy violation
 * 7. Comment removal is recorded with proper metadata
 */
export async function test_api_comment_removal_by_admin_for_platform_policy_violation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create member account
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 3: Member creates a community
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "general",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Switch to admin context and create a comment that violates platform policy
  const commentData = {
    reddit_like_post_id: post.id,
    content_text:
      "This comment contains content that violates platform-wide policies regarding harassment and hate speech. This is test content for policy violation removal.",
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 6: Administrator removes the comment for platform policy violation
  const removalData = {
    removal_type: "platform",
    reason_category: "platform_policy_violation",
    reason_text:
      "This comment violates our platform-wide policy against harassment and hate speech. The content contains language that targets individuals based on protected characteristics, which is strictly prohibited across the entire platform.",
    internal_notes:
      "Removed for severe platform policy violation. Comment author has been notified of appeal process. Content preserved for review.",
  } satisfies IRedditLikeComment.IRemove;

  await api.functional.redditLike.admin.comments.remove(connection, {
    commentId: comment.id,
    body: removalData,
  });

  // Validation: The removal operation completed successfully without throwing errors
  // The actual verification of comment hiding, audit trail creation, and notification
  // would require additional API endpoints to retrieve and verify the moderation records,
  // which are not provided in the current API specification
}
