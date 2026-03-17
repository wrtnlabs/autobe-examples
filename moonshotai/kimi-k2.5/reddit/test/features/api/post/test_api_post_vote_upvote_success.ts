import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_post_vote_upvote_success(
  connection: api.IConnection,
) {
  // 1. MemberA (post author) setup: create community and subscribe
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberA);
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Subscribe to own community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 2. Create text post as memberA
  const post = await generate_random_reddit_like_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Record pre-vote state
  const preVoteScore = post.voteScore;
  // 3. MemberB (voter) setup: authenticate as different member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(memberB);
  // 4. Cast upvote as memberB using the utility function
  const vote = await generate_random_reddit_like_member_posts_votes_create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote",
      },
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 5. Validate vote response
  TestValidator.equals("vote_type is upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "voting member matches memberB",
    vote.member.id,
    memberB.id,
  );
  TestValidator.predicate(
    "vote has created_at timestamp",
    () => vote.created_at !== null,
  );
  TestValidator.predicate(
    "vote has updated_at timestamp",
    () => vote.updated_at !== null,
  );
}
