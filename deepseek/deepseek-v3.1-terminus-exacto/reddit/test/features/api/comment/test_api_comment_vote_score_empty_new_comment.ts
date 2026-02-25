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

/**
 * Test vote score retrieval for a newly created comment that has not received any votes yet.
 * Authenticate as a user, create a comment through full posting workflow, then immediately
 * retrieve the vote score statistics. Verify the response indicates zero upvotes, zero downvotes,
 * a score of zero, and appropriate timestamps. This validates the system correctly handles
 * comments without voting activity and returns meaningful empty state data.
 */
export async function test_api_comment_vote_score_empty_new_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community for the post context
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create a post to host the comment
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({
          sentences: 5,
        }) satisfies string & tags.MinLength<10>,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Retrieve vote score for the newly created comment
  const voteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      userConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteScore);
  // Validate empty vote state
  TestValidator.equals(
    "upvote count should be zero",
    voteScore.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote count should be zero",
    voteScore.downvote_count,
    0,
  );
  TestValidator.equals("score should be zero", voteScore.score, 0);
  TestValidator.predicate(
    "vote score ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      voteScore.id,
    ),
  );
  TestValidator.predicate(
    "last_updated_at should be valid timestamp",
    new Date(voteScore.last_updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    new Date(voteScore.created_at).getTime() > 0,
  );
}
