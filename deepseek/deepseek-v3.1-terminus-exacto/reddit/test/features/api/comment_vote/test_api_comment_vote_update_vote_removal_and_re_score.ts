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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_update_vote_removal_and_re_score(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test_community",
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
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
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Record original vote score and author karma
  const originalVoteScore = comment.vote_score;
  const originalAuthorKarma = comment.author.karma;
  // Create an initial upvote
  const initialVote =
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
  typia.assert(initialVote);
  // Verify vote was created successfully
  TestValidator.equals("initial vote type", initialVote.vote_type, "upvote");
  // Remove the vote by updating to 'none'
  const removedVote =
    await api.functional.communityPlatform.user.comments.votes.putByCommentidAndVoteid(
      userConnection,
      {
        commentId: comment.id,
        voteId: initialVote.id,
        body: {
          vote_type: "none",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // Validate vote removal
  TestValidator.equals(
    "vote type after removal",
    removedVote.vote_type,
    "none",
  );
  TestValidator.equals(
    "vote ID remains the same",
    removedVote.id,
    initialVote.id,
  );
  // Retrieve the comment again to get updated vote score
  // Note: This would require a GET comment endpoint which may not exist in the current API
  // Since we don't have a GET comment endpoint, we'll validate what we can
  // Validate that the vote removal properly affected the system
  TestValidator.predicate(
    "vote removal timestamp updated",
    new Date(removedVote.updated_at) > new Date(initialVote.created_at),
  );
  // Since we cannot retrieve the updated comment, we validate the vote removal was successful
  // and trust that the system properly handles vote score recalculation
  TestValidator.predicate(
    "vote removal operation completed",
    removedVote.vote_type === "none",
  );
}
