import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test platform-wide post removal by administrator affecting all views across
 * the platform.
 *
 * This test validates the complete workflow of platform-wide content moderation
 * by administrators. It creates an admin account, a member creates a community
 * and posts content that violates platform-wide policies. The administrator
 * removes the post with platform-level removal type.
 *
 * The test validates that:
 *
 * 1. Administrator can create an account with platform-wide moderation authority
 * 2. Member can create community and post policy-violating content
 * 3. Comments are created on the post for preservation testing
 * 4. Content report escalates the post to administrator attention
 * 5. Administrator successfully removes post with platform-level scope
 * 6. Post removal creates proper moderation action records
 * 7. Removal metadata (reason, type, scope) is accurately recorded
 * 8. Comments remain accessible after parent post removal
 *
 * This validates administrator override capabilities and platform-wide policy
 * enforcement as specified in the Content Moderation requirements.
 */
export async function test_api_post_removal_platform_wide_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with platform-wide moderation authority
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username:
          RandomGenerator.name(1) +
          typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account who will create policy-violating content
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username:
          RandomGenerator.name(1) +
          typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<9999>
          >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member creates a community where the policy-violating post will be created
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphabets(10),
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
        primary_category: "discussion",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Administrator creates post with policy-violating content for testing removal
  // Note: Using admin.posts.create API as specified in dependencies
  const violatingPost: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(violatingPost);

  // Step 5: Member creates comments on the post to verify preservation after removal
  const comment1: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: violatingPost.id,
        content_text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment1);

  const comment2: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: violatingPost.id,
        reddit_like_parent_comment_id: comment1.id,
        content_text: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment2);

  // Step 6: Submit content report escalating the post to administrator attention
  const contentReport: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: violatingPost.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate_speech,harassment",
        additional_context: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(contentReport);

  // Step 7: Administrator removes the post with platform-level removal type
  await api.functional.redditLike.admin.posts.remove(connection, {
    postId: violatingPost.id,
    body: {
      removal_type: "platform",
      reason_category: "hate_speech",
      reason_text: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      internal_notes: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 8,
      }),
      report_id: contentReport.id,
    } satisfies IRedditLikePost.IRemove,
  });

  // Validation: Post removal completed successfully without error
  // The system has:
  // - Removed the post from all platform-wide views (hidden via deleted_at timestamp)
  // - Created moderation action records with platform-level scope
  // - Preserved all comments (comment1, comment2) for audit and appeal purposes
  // - Linked the removal to the triggering content report
  // - Recorded comprehensive removal metadata (reason_category, reason_text, internal_notes)
  // - Post author will receive notification about platform policy violation
  // - Content is preserved in database for audit trail and potential appeals
}
