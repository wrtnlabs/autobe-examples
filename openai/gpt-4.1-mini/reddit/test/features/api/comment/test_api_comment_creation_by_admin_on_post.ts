import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * End-to-end validation test for admin comment creation on a post.
 *
 * This test performs the following comprehensive workflow to ensure that an
 * admin user can successfully create comments on posts:
 *
 * 1. Register and authenticate an admin user
 * 2. Register and authenticate a member user (required for community/post
 *    creation)
 * 3. Member user creates a new community
 * 4. Member user creates a new post in the community
 * 5. Authenticated admin user creates a new comment on the created post
 *
 * Each step includes type assertions and validates that the returned data is
 * consistent with business logic. The comment creation supports nested replies
 * by specifying an optional parent comment ID, although this test focuses on a
 * root level comment creation.
 *
 * The test asserts correctness of IDs, timestamps, and author assignments,
 * demonstrating full integration of authentication, community management, post
 * operations, and comment creation APIs.
 *
 * All API calls are awaited and responses validated with typia.assert and
 * business assertions using TestValidator to ensure comprehensive correctness
 * and authorization enforcement.
 */
export async function test_api_comment_creation_by_admin_on_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "ComplexPassw0rd!",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register and authenticate a member user
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 3. Member user creates a new community
  const communityName: string = RandomGenerator.name(1)
    .replace(/\s+/g, "_")
    .toLowerCase();
  const communityDescription: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  TestValidator.equals("community name matches", community.name, communityName);

  // 4. Member user creates a post in the community
  const postTitle: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const postBodyText: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const postType = "text";
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: postType,
          title: postTitle,
          body_text: postBodyText,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  TestValidator.equals(
    "post belongs to community",
    post.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post type is text", post.post_type, postType);

  // 5. Admin user creates a comment on the post
  const commentBodyText: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.admin.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          body_text: commentBodyText,
          author_member_id: admin.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment is for correct post",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author matches admin",
    comment.author_member_id,
    admin.id,
  );
  TestValidator.equals(
    "comment body text matches",
    comment.body_text,
    commentBodyText,
  );
  TestValidator.predicate(
    "comment created_at is valid ISO string",
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "comment updated_at is valid ISO string",
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
  TestValidator.predicate(
    "comment deleted_at is null or undefined",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );
}
