import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_member_comments_votes_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

/**
 * Test member casting an upvote on another member's comment.
 *
 * Validates the complete comment voting workflow including member authentication, content creation, and vote recording. Ensures that the vote is properly recorded, the comment's vote score increases by 1, and the comment author's karma score increases by 1.
 *
 * The test creates two separate member accounts (voter and author) to simulate a realistic voting scenario where one member votes on content created by another. This validates the karma system integration and vote tracking functionality.
 *
 * 1. Authenticate voter member with randomized credentials.
 * 2. Authenticate author member with different randomized credentials.
 * 3. Author creates a community for posting content.
 * 4. Author creates a text post in the community.
 * 5. Author creates a comment on the post.
 * 6. Voter casts an upvote on the comment.
 * 7. Validates vote response contains correct vote_type and references.
 * 8. Validates comment vote_score increased by 1.
 * 9. Validates author karma_score increased by 1.
 */
export async function test_api_comment_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(voterAuth);
  // 2. Authenticate author member (different account)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(authorAuth);
  // 3. Author creates a community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Author creates a text post in the community
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(authorConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 5. Author creates a comment on the post
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Store initial karma score for validation
  const initialKarmaScore: number = comment.author.karma_score;
  const initialVoteScore: number = comment.vote_score;
  // 6. Voter casts an upvote on the comment
  const vote: IRedditLikeVote =
    await generate_random_reddit_like_member_comments_votes_create(
      voterConnection,
      {
        body: {
          vote_type: "upvote",
        } satisfies IRedditLikeVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(vote);
  // 7. Validate vote response
  TestValidator.equals("vote type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote references correct comment",
    vote.comment?.id,
    comment.id,
  );
  TestValidator.equals(
    "vote references correct voter",
    vote.author.id,
    voterAuth.id,
  );
  // 8. Validate vote score increased by 1
  TestValidator.equals(
    "comment vote score increased by 1",
    vote.comment?.vote_score,
    initialVoteScore + 1,
  );
  // 9. Validate karma score increased by 1
  TestValidator.equals(
    "author karma increased by 1",
    vote.comment?.author.karma_score,
    initialKarmaScore + 1,
  );
}
