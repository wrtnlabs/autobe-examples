import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_vote_moderator_removes_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
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
  // Store comment author's initial karma for comparison
  const initialAuthorKarma = comment.author.karma;
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // Apply initial upvote on comment
  const commentWithVote =
    await api.functional.communityPlatform.moderator.comments.votes.update(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(commentWithVote);
  // Store initial vote score and author karma after upvote
  const initialVoteScore = commentWithVote.vote_score;
  const karmaAfterUpvote = commentWithVote.author.karma;
  // Remove vote by setting vote_type to 'none'
  const commentWithoutVote =
    await api.functional.communityPlatform.moderator.comments.votes.update(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "none" as const,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(commentWithoutVote);
  // Validate vote removal effects
  TestValidator.equals(
    "vote score should decrease by 1 after removal",
    commentWithoutVote.vote_score,
    initialVoteScore - 1,
  );
  TestValidator.equals(
    "comment ID should remain unchanged",
    commentWithoutVote.id,
    comment.id,
  );
  TestValidator.notEquals(
    "vote score should not equal initial score",
    commentWithoutVote.vote_score,
    initialVoteScore,
  );
  // Validate karma system effects as mentioned in scenario
  TestValidator.equals(
    "author karma should decrease after vote removal",
    commentWithoutVote.author.karma,
    karmaAfterUpvote - 1,
  );
  TestValidator.predicate(
    "author karma handling should be graceful",
    () =>
      commentWithoutVote.author.karma >= 0 &&
      commentWithoutVote.author.karma <= karmaAfterUpvote,
  );
  // Edge case validation: ensure no duplicate voting scenario
  await TestValidator.error(
    "should not allow duplicate vote removal",
    async () => {
      await api.functional.communityPlatform.moderator.comments.votes.update(
        moderatorConnection,
        {
          commentId: comment.id,
          body: {
            vote_type: "none" as const,
          } satisfies ICommunityPlatformCommentVote.IUpdate,
        },
      );
    },
  );
  // Final validation that all basic properties are preserved
  TestValidator.equals(
    "comment content should remain unchanged",
    commentWithoutVote.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author should remain the same",
    commentWithoutVote.author.id,
    comment.author.id,
  );
  TestValidator.predicate(
    "vote removal should not affect other comment properties",
    () =>
      commentWithoutVote.created_at === comment.created_at &&
      commentWithoutVote.post.id === comment.post.id,
  );
}
