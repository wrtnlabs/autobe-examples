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
 * Validates that an admin user can retrieve detailed information about a
 * specific comment on a post.
 *
 * The test performs the following steps:
 *
 * 1. Registers a new admin user and verifies successful authentication.
 * 2. Registers a member user who will create content.
 * 3. Creates a community using the member user credentials.
 * 4. Creates a post within the community.
 * 5. Adds a comment to the post using the member user credentials.
 * 6. Uses the admin user's credentials to retrieve detailed comment information.
 * 7. Validates that the retrieved comment matches the created comment's data.
 *
 * The test confirms that only an authenticated admin user can access comment
 * details, and the returned data correctly represents the comment content,
 * authorship, and timestamps.
 */
export async function test_api_reddit_community_comment_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a member user
  // Empty headers to simulate a fresh un-authenticated session for member registration
  const memberConnection: api.IConnection = { ...connection, headers: {} };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 3. Create a new community using member credentials
  const communityName = RandomGenerator.alphabets(10);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create a new post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postBodyText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      memberConnection,
      {
        communityId: community.id,
        body: {
          post_type: "text",
          reddit_community_community_id: community.id,
          title: postTitle,
          body_text: postBodyText,
          author_member_id: null,
          author_guest_id: null,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 5. Create a comment on the post by member
  const commentBodyText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: null,
          author_member_id: member.id,
          author_guest_id: null,
          reddit_community_post_id: post.id,
          body_text: commentBodyText,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. As admin, retrieve detailed comment information
  // Clean headers so that the admin tokens from login are used
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  const commentDetailed: IRedditCommunityComment =
    await api.functional.redditCommunity.admin.posts.comments.at(
      adminConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(commentDetailed);

  // 7. Validate the retrieved comment matches the created comment
  TestValidator.equals(
    "comment ID should match",
    commentDetailed.id,
    comment.id,
  );
  TestValidator.equals(
    "post ID should match",
    commentDetailed.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment body text should match",
    commentDetailed.body_text,
    comment.body_text,
  );
  TestValidator.equals(
    "author member ID should match",
    commentDetailed.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "parent comment ID should be null",
    commentDetailed.parent_comment_id,
    null,
  );
  TestValidator.predicate(
    "created_at should be defined",
    typeof commentDetailed.created_at === "string" &&
      commentDetailed.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be defined",
    typeof commentDetailed.updated_at === "string" &&
      commentDetailed.updated_at.length > 0,
  );
}
