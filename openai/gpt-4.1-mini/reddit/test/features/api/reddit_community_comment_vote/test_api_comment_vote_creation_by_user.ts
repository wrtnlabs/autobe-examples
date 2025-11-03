import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

/**
 * End-to-end test scenario for Reddit community comment vote creation.
 *
 * This test walks through a real-world user journey starting from user
 * registration, community creation, posting content, commenting on that
 * content, and then finally voting on a comment.
 *
 * Step-by-step:
 *
 * 1. Register and authenticate a new user.
 * 2. Create a new community with a unique and realistic name.
 * 3. Create a post in the community with text content type.
 * 4. Add a top-level comment to the post.
 * 5. Cast a vote on the comment, either upvote or downvote.
 * 6. Assert all returned data structures and business rules.
 *
 * This test validates API contracts, authentication state, and business logic
 * enforcement, ensuring that voting on comments behaves as expected under
 * typical user operations.
 */
export async function test_api_comment_vote_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration and authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "securePassword123",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. User creates a new community
  // Generate a unique community name (lowercase alphanumeric, 6-12 chars)
  const communityName = RandomGenerator.alphaNumeric(
    RandomGenerator.pick([6, 7, 8, 9, 10, 11, 12] as const),
  ).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 3. User creates a post in the community
  // For content type ID, simulate a UUID (must be a valid uuid)
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  // The post status: using 'active' as a valid example
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });

  const postCreateBody = {
    title: postTitle,
    body: postBody,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post status is active", post.status, "active");

  // 4. User comments on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 4 });
  const commentCreateBody = {
    body: commentBody,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment body matches", comment.body, commentBody);

  // 5. User votes on the comment
  // Vote type must be 'upvote' or 'downvote' (pick randomly for test)
  const voteTypes = ["upvote", "downvote"] as const;
  const voteType = RandomGenerator.pick(voteTypes);

  const voteCreateBody = {
    reddit_community_comment_id: comment.id,
    vote_type: voteType,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.user.communities.comments.votes.create(
      connection,
      {
        communityName: community.name,
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  TestValidator.equals("vote type matches request", vote.vote_type, voteType);
  TestValidator.equals(
    "vote comment ID matches",
    vote.reddit_community_comment_id,
    comment.id,
  );
}
