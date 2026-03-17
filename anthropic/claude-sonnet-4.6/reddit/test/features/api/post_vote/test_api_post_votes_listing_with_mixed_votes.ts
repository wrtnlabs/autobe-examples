import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_votes_listing_with_mixed_votes(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // STEP 1: Register post author and set up community + post
  // =========================================================================
  const authorConnection: api.IConnection = { host: connection.host };
  const authorInfo = await authorize_member_join(authorConnection, {});
  typia.assert(authorInfo);
  // Create community (using utility function)
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Author subscribes to the community
  const authorSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      { communityId: community.id },
    );
  typia.assert(authorSubscription);
  // Author creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // =========================================================================
  // STEP 2: Register Voter A, subscribe, and cast an upvote
  // =========================================================================
  const voterAConnection: api.IConnection = { host: connection.host };
  const voterAInfo = await authorize_member_join(voterAConnection, {});
  typia.assert(voterAInfo);
  // Voter A subscribes to the community
  const voterASubscription =
    await api.functional.community.member.communities.subscriptions.create(
      voterAConnection,
      { communityId: community.id },
    );
  typia.assert(voterASubscription);
  // Voter A casts an upvote
  const voterAVote = await api.functional.community.member.posts.votes.update(
    voterAConnection,
    {
      postId: post.id,
      body: { vote_type: "upvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(voterAVote);
  // =========================================================================
  // STEP 3: Register Voter B, subscribe, and cast a downvote
  // =========================================================================
  const voterBConnection: api.IConnection = { host: connection.host };
  const voterBInfo = await authorize_member_join(voterBConnection, {});
  typia.assert(voterBInfo);
  // Voter B subscribes to the community
  const voterBSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      voterBConnection,
      { communityId: community.id },
    );
  typia.assert(voterBSubscription);
  // Voter B casts a downvote
  const voterBVote = await api.functional.community.member.posts.votes.update(
    voterBConnection,
    {
      postId: post.id,
      body: { vote_type: "downvote" } satisfies ICommunityPostVote.IUpdate,
    },
  );
  typia.assert(voterBVote);
  // =========================================================================
  // STEP 4: Retrieve the vote listing for the post (no filter, default pagination)
  // =========================================================================
  const voteList = await api.functional.community.member.posts.votes.index(
    authorConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityPostVote.IRequest,
    },
  );
  typia.assert(voteList);
  // =========================================================================
  // STEP 5: Assertions
  // =========================================================================
  // Total records must be 2 (voter A + voter B)
  TestValidator.equals("total vote records", voteList.pagination.records, 2);
  // Current page should be 1
  TestValidator.equals("current page", voteList.pagination.current, 1);
  // Data array must contain exactly 2 items
  TestValidator.equals("vote data count", voteList.data.length, 2);
  // pagination.pages = Math.ceil(records / limit)
  // Default limit is 20, so Math.ceil(2 / 20) = 1
  TestValidator.equals(
    "total pages",
    voteList.pagination.pages,
    Math.ceil(voteList.pagination.records / voteList.pagination.limit),
  );
  // Find the upvote and downvote items
  const upvoteItem = voteList.data.find((v) => v.vote_type === "upvote");
  const downvoteItem = voteList.data.find((v) => v.vote_type === "downvote");
  // Both vote types must be present
  TestValidator.predicate("upvote item exists", upvoteItem !== undefined);
  TestValidator.predicate("downvote item exists", downvoteItem !== undefined);
  // Verify voter usernames
  TestValidator.equals(
    "upvote voter username matches voter A",
    upvoteItem!.voter.username,
    voterAInfo.username,
  );
  TestValidator.equals(
    "downvote voter username matches voter B",
    downvoteItem!.voter.username,
    voterBInfo.username,
  );
  // Verify post author is NOT in the vote list (authors cannot vote on their own posts)
  const authorVote = voteList.data.find(
    (v) => v.voter.username === authorInfo.username,
  );
  TestValidator.predicate("author vote not present", authorVote === undefined);
  // Verify default sort is descending by created_at (voter B's downvote appears first)
  // Since voter B voted after voter A, voter B's vote should be first (desc order)
  if (voteList.data.length === 2) {
    const firstItemDate = new Date(voteList.data[0]!.created_at).getTime();
    const secondItemDate = new Date(voteList.data[1]!.created_at).getTime();
    TestValidator.predicate(
      "votes sorted descending by created_at",
      firstItemDate >= secondItemDate,
    );
  }
}
