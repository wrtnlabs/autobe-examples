import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

/**
 * Test voting on a comment with immediate karma adjustment.
 * 1. Create and authenticate first member (comment author)
 * 2. Create a post by first member
 * 3. First member creates a comment on their post
 * 4. Capture initial comment vote_score for verification
 * 5. Create and authenticate second member (voter)
 * 6. Second member casts a downvote on the comment
 * 7. Verify the downvote was created correctly
 * 8. Verify comment's vote_score decreased by 1
 */
export async function test_api_vote_cast_on_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member (comment author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. First member creates a post (requires community subscription)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await generate_random_reddit_community_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: communityId,
        post_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. First member creates a comment on their post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      member1Connection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate | undefined,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Capture initial comment vote_score for verification
  // Full IRedditCommunityComment uses vote_score (snake_case)
  const initialCommentVoteScore = comment.vote_score;
  const commentAuthorId = comment.author.id;
  // 4. Create and authenticate second member (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  // 5. Second member casts a downvote on the comment
  const vote = await generate_random_reddit_community_member_votes_create(
    member2Connection,
    {
      body: {
        vote_type: "downvote" as const,
        target_comment_id: comment.id,
      } satisfies IRedditCommunityVote.ICreate | undefined,
    },
  );
  typia.assert(vote);
  // 6. Verify the downvote was created correctly
  TestValidator.equals("downvote type", vote.vote_type, "downvote" as const);
  TestValidator.equals(
    "downvote targets correct comment",
    vote.targetComment?.id,
    comment.id,
  );
  // 7. Verify comment's vote_score decreased by 1
  // vote.targetComment is IRedditCommunityComment.ISummary which uses voteScore (camelCase)
  TestValidator.equals(
    "comment vote_score decreased by 1",
    vote.targetComment?.voteScore,
    initialCommentVoteScore - 1,
  );
  // 8. Verify vote creation timestamp is valid
  typia.assert(vote.created_at);
  typia.assert(vote.updated_at);
}
