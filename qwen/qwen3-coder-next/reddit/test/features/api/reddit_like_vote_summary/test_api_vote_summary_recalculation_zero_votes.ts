import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVotesSum";
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

export async function test_api_vote_summary_recalculation_zero_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a new post with text type
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        type: "text" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Call PATCH /redditLike/member/posts/{postId}/vote-summary without any votes
  const voteSummary =
    await api.functional.redditLike.member.posts.vote_summary.updateVoteSummary(
      memberConnection,
      {
        postId: post.id,
        body: {
          ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
          userAgent: "test-agent",
        } satisfies IRedditLikePostVotesSum.IRequest,
      },
    );
  typia.assert(voteSummary);
  // 4. Verify vote_score is 0
  TestValidator.equals("vote_score is 0", voteSummary.vote_score, 0);
  // 5. Verify upvotes count is 0
  TestValidator.equals("upvotes is 0", voteSummary.upvotes, 0);
  // 6. Verify downvotes count is 0
  TestValidator.equals("downvotes is 0", voteSummary.downvotes, 0);
  // 7. Verify status is 'neutral'
  TestValidator.equals("status is 'neutral'", voteSummary.status, "neutral");
}
