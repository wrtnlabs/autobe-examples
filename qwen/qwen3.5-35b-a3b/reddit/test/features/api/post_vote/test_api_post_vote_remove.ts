import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";

export async function test_api_post_vote_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: "password123",
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com/ref",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberResult);
  // 2. Subscribe to a community (needed for post operations)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_subscribe(
      memberConnection,
      {
        body: {
          reddit_platform_community_id: communityId,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Generate a post ID (assuming it exists in the test environment)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Cast an upvote on the post
  const upvotedPost =
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      memberConnection,
      {
        postId: postId,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformPost.IVoteRequest,
      },
    );
  typia.assert(upvotedPost);
  // 5. Record the vote score after upvote
  const scoreAfterUpvote = upvotedPost.vote_score;
  // 6. Remove the vote by calling the vote endpoint with null
  const removedPost =
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      memberConnection,
      {
        postId: postId,
        body: {
          vote_type: null,
        } satisfies IRedditPlatformPost.IVoteRequest,
      },
    );
  typia.assert(removedPost);
  // 7. Record the vote score after removal
  const scoreAfterRemoval = removedPost.vote_score;
  // 8. Verify the score decreased by exactly 1 (removing the +1 contribution from upvote)
  TestValidator.equals(
    "post score decreased by 1 after vote removal",
    scoreAfterRemoval,
    scoreAfterUpvote - 1,
  );
}
