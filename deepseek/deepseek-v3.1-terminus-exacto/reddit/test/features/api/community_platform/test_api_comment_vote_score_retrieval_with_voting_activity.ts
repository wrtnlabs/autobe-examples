import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_votes_create } from "../../../generate/generate_random_community_platform_user_comments_votes_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_score_retrieval_with_voting_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create initial user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create additional users for voting
  const voterConnections: api.IConnection[] = ArrayUtil.repeat(5, () => ({
    host: connection.host,
  }));
  const voters = await Promise.all(
    voterConnections.map(async (voterConnection) => {
      const voter = await authorize_user_join(voterConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          username: RandomGenerator.alphaNumeric(12),
        } satisfies ICommunityPlatformUser.IJoin,
      });
      typia.assert(voter);
      return { connection: voterConnection, user: voter };
    }),
  );
  // Simulate voting activity: 3 upvotes, 2 downvotes
  const upvoteIndices = [0, 1, 2];
  const downvoteIndices = [3, 4];
  // Cast upvotes using voter-specific connections
  for (const index of upvoteIndices) {
    await generate_random_community_platform_user_comments_votes_create(
      voters[index].connection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  }
  // Cast downvotes using voter-specific connections
  for (const index of downvoteIndices) {
    await generate_random_community_platform_user_comments_votes_create(
      voters[index].connection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  }
  // Retrieve vote score using the original user connection
  const voteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      userConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteScore);
  // Validate vote score statistics
  TestValidator.equals("upvote count", voteScore.upvote_count, 3);
  TestValidator.equals("downvote count", voteScore.downvote_count, 2);
  TestValidator.equals("calculated score", voteScore.score, 1); // 3 upvotes - 2 downvotes = 1
  TestValidator.predicate(
    "last updated timestamp is valid",
    voteScore.last_updated_at !== null,
  );
  TestValidator.predicate(
    "created timestamp is valid",
    voteScore.created_at !== null,
  );
}
