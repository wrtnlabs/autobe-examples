import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
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
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_vote_summary_recalculation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  // 2. Create a post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);
  // 3. Cast several upvotes and downvotes on the post
  await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_reddit_like_member_posts_votes_create(memberConnection, {
        params: { postId: post.id },
        body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
      }),
    ),
  );
  await Promise.all(
    ArrayUtil.repeat(2, () =>
      generate_random_reddit_like_member_posts_votes_create(memberConnection, {
        params: { postId: post.id },
        body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
      }),
    ),
  );
  // 4. Call PATCH /redditLike/member/posts/{postId}/vote-summary to trigger recalculation
  const voteSummary: IRedditLikePostVotesSum =
    await api.functional.redditLike.member.posts.vote_summary.updateVoteSummary(
      memberConnection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(voteSummary);
  // 5. Verify the returned vote_score matches expected value (upvotes - downvotes)
  TestValidator.equals("vote score calculation", voteSummary.vote_score, 1);
  // 6. Verify upvotes and downvotes counts are accurate
  TestValidator.equals("upvotes count", voteSummary.upvotes, 3);
  TestValidator.equals("downvotes count", voteSummary.downvotes, 2);
  // 7. Verify status field reflects member's current vote if present
  TestValidator.equals("status", voteSummary.status, "neutral");
}
