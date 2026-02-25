import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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

export async function test_api_comment_vote_change_scenario(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post in community
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
  // Create comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Test 1: Initial upvote
  const firstVote =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(firstVote);
  TestValidator.equals(
    "first vote should be upvote",
    firstVote.vote_type,
    "upvote",
  );
  TestValidator.predicate(
    "first vote should have created_at",
    firstVote.created_at !== null,
  );
  TestValidator.predicate(
    "first vote should have updated_at",
    firstVote.updated_at !== null,
  );
  // Test 2: Change to downvote
  const secondVote =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(secondVote);
  TestValidator.equals(
    "second vote should be downvote",
    secondVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "updated_at should be newer",
    secondVote.updated_at,
    firstVote.updated_at,
  );
  TestValidator.equals(
    "vote id should be the same",
    secondVote.id,
    firstVote.id,
  );
  // Test 3: Remove vote (set to none)
  const thirdVote =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        body: {
          vote_type: "none",
        } satisfies ICommunityPlatformCommentVote.ICreate,
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(thirdVote);
  TestValidator.equals(
    "third vote should be none",
    thirdVote.vote_type,
    "none",
  );
  TestValidator.notEquals(
    "updated_at should be newer again",
    thirdVote.updated_at,
    secondVote.updated_at,
  );
  TestValidator.equals(
    "vote id should remain the same",
    thirdVote.id,
    firstVote.id,
  );
  // Final validation
  TestValidator.equals(
    "user should match",
    thirdVote.user.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "comment should match",
    thirdVote.comment.id,
    comment.id,
  );
}
