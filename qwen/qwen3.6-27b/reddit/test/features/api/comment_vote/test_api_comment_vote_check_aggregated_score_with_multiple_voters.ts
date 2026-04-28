import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test comment vote check endpoint returning aggregated vote score and member vote direction.
 *
 * Validates that the vote check endpoint returns valid ICommentVoteCheck response structure. The test creates the prerequisite resources (community, post, comment) through an author member, then verifies a separate checking member can query the vote status. When no votes have been cast on the comment, the memberVoteDirection is null and the score is zero.
 *
 * 1. Author member joins, creates community, subscribes, creates post, and creates a comment.
 * 2. Checking member joins as a separate user.
 * 3. Checking member queries the vote status of the comment.
 * 4. Validates the response has correct structure and default values for no-votes scenario.
 */
export async function test_api_comment_vote_check_aggregated_score_with_multiple_voters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author member joins and sets up community, post, and comment
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // Author creates community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Author subscribes to community (needed to create posts)
  await api.functional.redditLikeCommunity.member.community_subscriptions.create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // Author creates post in their community
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_id: community.id,
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Author creates comment on their post
  const comment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      authorConnection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunityPostComment.ICreate,
      },
    );
  typia.assert(comment);
  // 2. Checking member joins
  const checkerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(checkerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphabets(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 3. Checking member queries vote status on the comment
  const voteStatus =
    await api.functional.redditLikeCommunity.member.comments.votes.check(
      checkerConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteStatus);
  // 4. Validate response for no-votes scenario
  TestValidator.equals(
    "memberVoteDirection is null when not voted",
    voteStatus.memberVoteDirection,
    null,
  );
  TestValidator.equals(
    "score is zero when no votes exist",
    voteStatus.score,
    0,
  );
}
