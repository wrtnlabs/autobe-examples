import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_vote_score_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using the authorization utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post in a community using the member connection
  // Note: The community must exist and member must be subscribed
  // For this test, we'll use a post creation which implicitly handles the relationship
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Get vote summary for the newly created post
  const summary = await api.functional.redditLike.posts.votes.summary(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(summary);
  // 4. Validate initial vote summary state
  TestValidator.equals("initial vote score should be 0", summary.vote_score, 0);
  TestValidator.equals(
    "initial upvote count should be 0",
    summary.upvote_count,
    0,
  );
  TestValidator.equals(
    "initial downvote count should be 0",
    summary.downvote_count,
    0,
  );
  TestValidator.predicate(
    "vote_score is int32",
    typeof summary.vote_score === "number" &&
      summary.vote_score >= -2147483648 &&
      summary.vote_score <= 2147483647,
  );
}
