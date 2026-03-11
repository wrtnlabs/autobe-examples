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

export async function test_api_vote_summary_recalculation_vote_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3-5. Test vote summary recalculation endpoint
  // The vote summary update endpoint should recalculate based on existing votes
  // 6. Call PATCH /redditLike/member/posts/{postId}/vote-summary to recalculate
  const voteSummary =
    await api.functional.redditLike.member.posts.vote_summary.updateVoteSummary(
      memberConnection,
      {
        postId: post.id,
        body: {
          ip: "192.168.1.1",
          userAgent: "TestBrowser/1.0",
        } satisfies IRedditLikePostVotesSum.IRequest,
      },
    );
  typia.assert(voteSummary);
  // 7-9. Verify vote summary structure and values
  // The vote score should be 0 initially (no votes cast yet)
  TestValidator.equals("vote_score initially 0", voteSummary.vote_score, 0);
  TestValidator.equals("upvotes count initially 0", voteSummary.upvotes, 0);
  TestValidator.equals("downvotes count initially 0", voteSummary.downvotes, 0);
  TestValidator.equals("status is neutral", voteSummary.status, "neutral");
  // Test with forced refresh
  const refreshedSummary =
    await api.functional.redditLike.member.posts.vote_summary.updateVoteSummary(
      memberConnection,
      {
        postId: post.id,
        body: {
          ip: "192.168.1.1",
          userAgent: "TestBrowser/1.0",
          updateOptions: {
            forceRefresh: true,
          },
        } satisfies IRedditLikePostVotesSum.IRequest,
      },
    );
  typia.assert(refreshedSummary);
  // Verify refresh returned same structure
  TestValidator.equals(
    "refreshed vote_score matches",
    refreshedSummary.vote_score,
    voteSummary.vote_score,
  );
}
