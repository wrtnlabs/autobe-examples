import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_scores_retrieval_with_votes(
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
        post_type: "text" as const,
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
  // Retrieve vote scores for the comment
  const scores =
    await api.functional.communityPlatform.posts.comments.scores.at(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(scores);
  // Validate the aggregated vote statistics structure
  TestValidator.equals("scores has UUID id", typeof scores.id, "string");
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      scores.id,
    ),
  );
  TestValidator.predicate(
    "upvote_count is integer",
    Number.isInteger(scores.upvote_count),
  );
  TestValidator.predicate(
    "downvote_count is integer",
    Number.isInteger(scores.downvote_count),
  );
  TestValidator.predicate("score is integer", Number.isInteger(scores.score));
  TestValidator.predicate(
    "upvote_count is non-negative",
    scores.upvote_count >= 0,
  );
  TestValidator.predicate(
    "downvote_count is non-negative",
    scores.downvote_count >= 0,
  );
  // Validate score calculation formula (upvotes - downvotes)
  TestValidator.equals(
    "score equals upvote_count minus downvote_count",
    scores.score,
    scores.upvote_count - scores.downvote_count,
  );
  // Validate timestamp formats and relationships
  TestValidator.predicate(
    "last_updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      scores.last_updated_at,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(scores.created_at),
  );
  // Validate that last_updated_at is not before created_at
  const createdDate = new Date(scores.created_at);
  const updatedDate = new Date(scores.last_updated_at);
  TestValidator.predicate(
    "last_updated_at is after or equal to created_at",
    updatedDate >= createdDate,
  );
  // Validate that the scores are pre-calculated (non-null values)
  TestValidator.predicate(
    "upvote_count is defined",
    scores.upvote_count !== undefined,
  );
  TestValidator.predicate(
    "downvote_count is defined",
    scores.downvote_count !== undefined,
  );
  TestValidator.predicate("score is defined", scores.score !== undefined);
}
