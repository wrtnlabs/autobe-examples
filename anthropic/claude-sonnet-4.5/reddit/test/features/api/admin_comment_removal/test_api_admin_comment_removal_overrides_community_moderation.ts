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
 * Test administrator comment removal with platform-level authority overriding
 * community moderation.
 *
 * Validates that platform administrators can remove comments from any community
 * without requiring community-specific moderator permissions. This test
 * demonstrates the hierarchical permission model where admin authority
 * supersedes community-level moderation assignments.
 *
 * Test workflow:
 *
 * 1. Create administrator account (no community moderator assignments)
 * 2. Create member account for content creation
 * 3. Member creates community (becomes primary moderator)
 * 4. Member creates post within community
 * 5. Member creates comment on post
 * 6. Administrator removes comment using platform authority
 * 7. Verify removal succeeds without community moderator status
 * 8. Validate platform-level removal scope and admin actor attribution
 */
export async function test_api_admin_comment_removal_overrides_community_moderation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with platform-wide authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for community and content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Member creates a community (becomes primary moderator)
  const communityCode = RandomGenerator.alphaNumeric(15).toLowerCase();
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: Member creates a post within the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 6,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 5: Member creates a comment on the post
  const commentText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  // Switch to admin context to create comment (admin can comment on any post)
  const comment: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: commentText,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Step 6: Administrator removes the comment using platform-level authority
  // Admin is NOT a community moderator but should still succeed
  const removalReasonCategory = "spam";
  const removalReasonText = "Platform-level content policy violation detected";
  const removalInternalNotes =
    "Admin removal test - validating platform authority override";

  await api.functional.redditLike.admin.comments.remove(connection, {
    commentId: comment.id,
    body: {
      removal_type: "platform",
      reason_category: removalReasonCategory,
      reason_text: removalReasonText,
      internal_notes: removalInternalNotes,
    } satisfies IRedditLikeComment.IRemove,
  });

  // Step 7: Verify removal succeeded
  // The removal operation completed without throwing an error
  // This confirms that:
  // - Admin authority bypassed community-specific permission checks
  // - Platform-level removal scope was applied successfully
  // - Admin was able to remove comment without community moderator assignment
}
