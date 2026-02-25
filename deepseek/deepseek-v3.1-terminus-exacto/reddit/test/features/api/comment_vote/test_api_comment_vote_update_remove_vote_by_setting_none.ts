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

export async function test_api_comment_vote_update_remove_vote_by_setting_none(
  connection: api.IConnection,
): Promise<void> {
  // User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post for comment context
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test_community",
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a comment on the post
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
  // Record initial vote score and author karma
  const initialVoteScore = comment.vote_score;
  const initialAuthorKarma = comment.author.karma;
  // Cast an initial vote (randomly choose between upvote and downvote)
  const voteTypes = ["upvote", "downvote"] as const;
  const initialVoteType = RandomGenerator.pick(voteTypes);
  const initialVote =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: initialVoteType,
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Update vote to 'none' to remove it
  const updatedVote =
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
  typia.assert(updatedVote);
  // Validate vote removal
  TestValidator.equals(
    "vote type should be 'none'",
    updatedVote.vote_type,
    "none",
  );
  // Note: The comment's vote score and author karma validation would require
  // fetching the updated comment data, but the current API doesn't provide
  // a way to retrieve individual comment details. The test validates the
  // vote removal functionality which is the primary focus of this scenario.
}
