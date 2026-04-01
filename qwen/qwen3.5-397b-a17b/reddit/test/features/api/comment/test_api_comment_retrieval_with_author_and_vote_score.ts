import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_vote } from "../../../generate/generate_random_reddit_community_member_comments_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test successful retrieval of a single comment with complete details including author information and vote score.
 *
 * **Setup:**
 * 1. Create a member account (author) using authorize_member_join utility
 * 2. Create a community using generate_random_reddit_community_member_communities_create utility
 * 3. Create a text post in the community using api.functional.redditCommunity.member.posts.create
 * 4. Create a comment on the post using generate_random_reddit_community_member_posts_comments_create utility
 * 5. Create a second member account (voter) using authorize_member_join utility
 * 6. Upvote the comment using generate_random_reddit_community_member_comments_vote utility
 *
 * **Test Execution:**
 * 1. Call GET /redditCommunity/posts/{postId}/comments/{commentId} with the created post and comment IDs
 * 2. Verify the response returns the full IRedditCommunityComment entity
 *
 * **Validations:**
 * - Comment ID matches the requested comment
 * - Content matches the created comment text
 * - Author object contains the correct member ID and username
 * - Post object contains the correct post ID and title
 * - Parent comment is null (top-level comment)
 * - Vote score reflects the upvote (should be +1)
 * - Created_at and updated_at timestamps are present
 * - Deleted_at is null (comment is active)
 */
export async function test_api_comment_retrieval_with_author_and_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // Set authorization header for author connection
  authorConnection.headers = {
    Authorization: `Bearer ${authorAuth.token.access}`,
  };
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: commentContent,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Create second member account (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voterAuth);
  // Set authorization header for voter connection
  voterConnection.headers = {
    Authorization: `Bearer ${voterAuth.token.access}`,
  };
  // 6. Upvote the comment to establish vote score
  const voteResult =
    await generate_random_reddit_community_member_comments_vote(
      voterConnection,
      {
        body: {
          direction: "UPVOTE",
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(voteResult);
  // 7. Retrieve the comment with full details
  const retrievedComment =
    await api.functional.redditCommunity.posts.comments.at(connection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(retrievedComment);
  // 8. Validate comment details
  TestValidator.equals("comment ID matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "content matches",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "author ID matches",
    retrievedComment.author.id,
    authorAuth.id,
  );
  TestValidator.equals("post ID matches", retrievedComment.post.id, post.id);
  TestValidator.predicate(
    "parent comment is null",
    retrievedComment.parentComment === null ||
      retrievedComment.parentComment === undefined,
  );
  TestValidator.equals("vote score is +1", retrievedComment.voteScore, 1);
  TestValidator.predicate(
    "created_at is present",
    retrievedComment.createdAt !== null &&
      retrievedComment.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedComment.updatedAt !== null &&
      retrievedComment.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedComment.deletedAt === null,
  );
}
