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

export async function test_api_comment_vote_score_multiple_user_voting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary user account and authenticate
  const primaryUserConnection: api.IConnection = { host: connection.host };
  const primaryUser = await authorize_user_join(primaryUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(primaryUser);
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      primaryUserConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_community_platform_user_posts_create(
    primaryUserConnection,
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
  // 4. Create a comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      primaryUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Create secondary user account
  const secondaryUserConnection: api.IConnection = { host: connection.host };
  const secondaryUser = await authorize_user_join(secondaryUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(secondaryUser);
  // 6. Create tertiary user account
  const tertiaryUserConnection: api.IConnection = { host: connection.host };
  const tertiaryUser = await authorize_user_join(tertiaryUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(tertiaryUser);
  // 7. Get initial vote score (should be 0)
  const initialVoteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      primaryUserConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(initialVoteScore);
  TestValidator.equals(
    "initial upvote count",
    initialVoteScore.upvote_count,
    0,
  );
  TestValidator.equals(
    "initial downvote count",
    initialVoteScore.downvote_count,
    0,
  );
  TestValidator.equals("initial net score", initialVoteScore.score, 0);
  // 8. Primary user votes up
  const primaryVote =
    await generate_random_community_platform_user_comments_votes_create(
      primaryUserConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(primaryVote);
  // 9. Check vote score after first vote
  const afterFirstVoteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      primaryUserConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(afterFirstVoteScore);
  TestValidator.equals(
    "after first vote upvote count",
    afterFirstVoteScore.upvote_count,
    1,
  );
  TestValidator.equals(
    "after first vote downvote count",
    afterFirstVoteScore.downvote_count,
    0,
  );
  TestValidator.equals(
    "after first vote net score",
    afterFirstVoteScore.score,
    1,
  );
  // 10. Secondary user votes down
  const secondaryVote =
    await generate_random_community_platform_user_comments_votes_create(
      secondaryUserConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(secondaryVote);
  // 11. Check vote score after second vote
  const afterSecondVoteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      primaryUserConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(afterSecondVoteScore);
  TestValidator.equals(
    "after second vote upvote count",
    afterSecondVoteScore.upvote_count,
    1,
  );
  TestValidator.equals(
    "after second vote downvote count",
    afterSecondVoteScore.downvote_count,
    1,
  );
  TestValidator.equals(
    "after second vote net score",
    afterSecondVoteScore.score,
    0,
  );
  // 12. Tertiary user votes up
  const tertiaryVote =
    await generate_random_community_platform_user_comments_votes_create(
      tertiaryUserConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(tertiaryVote);
  // 13. Check vote score after third vote
  const afterThirdVoteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      primaryUserConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(afterThirdVoteScore);
  TestValidator.equals(
    "after third vote upvote count",
    afterThirdVoteScore.upvote_count,
    2,
  );
  TestValidator.equals(
    "after third vote downvote count",
    afterThirdVoteScore.downvote_count,
    1,
  );
  TestValidator.equals(
    "after third vote net score",
    afterThirdVoteScore.score,
    1,
  );
  // 14. Secondary user changes vote to upvote
  const secondaryVoteChange =
    await generate_random_community_platform_user_comments_votes_create(
      secondaryUserConnection,
      {
        params: { commentId: comment.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(secondaryVoteChange);
  // 15. Retrieve final vote score
  const finalVoteScore =
    await api.functional.communityPlatform.user.comments.vote_score.at(
      primaryUserConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(finalVoteScore);
  // 16. Validate final vote aggregation
  // Expected: Primary user (upvote) + Secondary user (upvote) + Tertiary user (upvote) = 3 upvotes, 0 downvotes
  TestValidator.equals("final upvote count", finalVoteScore.upvote_count, 3);
  TestValidator.equals(
    "final downvote count",
    finalVoteScore.downvote_count,
    0,
  );
  TestValidator.equals("final net score", finalVoteScore.score, 3);
  // 17. Validate timestamp progression
  TestValidator.predicate(
    "last updated after creation",
    new Date(finalVoteScore.last_updated_at) >
      new Date(finalVoteScore.created_at),
  );
  TestValidator.predicate(
    "final update after initial",
    new Date(finalVoteScore.last_updated_at) >
      new Date(initialVoteScore.last_updated_at),
  );
}
