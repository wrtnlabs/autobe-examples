import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_votes_listing_with_multiple_voters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate Member A and create community, then subscribe
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // Step 2: Authenticate Member B and subscribe to the community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // Step 3: Authenticate Member C and subscribe to the community
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {});
  typia.assert(memberCAuthorized);
  await generate_random_reddit_clone_member_subscriptions_create(
    memberCConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // Step 4: Member B creates a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Step 5: Member A upvotes the post
  await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
    memberAConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        direction: "upvote",
      },
    },
  );
  // Step 6: Member C downvotes the post
  await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
    memberCConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        direction: "downvote",
      },
    },
  );
  // Step 7: Member B upvotes their own post
  await generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
    memberBConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        direction: "upvote",
      },
    },
  );
  // Step 8: Call GET /redditClone/member/posts/{postId}/votes as Member B
  const votesResponse =
    await api.functional.redditClone.member.posts.votes.list(
      memberBConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(votesResponse);
  // Validations
  TestValidator.equals("votes count", votesResponse.data.length, 3);
  // Each vote should include member id, username, and direction
  for (const vote of votesResponse.data) {
    TestValidator.predicate("vote has member id", !!vote.member.id);
    TestValidator.predicate("vote has username", !!vote.member.username);
    TestValidator.predicate(
      "vote direction is valid",
      vote.direction === "upvote" || vote.direction === "downvote",
    );
  }
  // Verify all three members have voted
  const voterIds = votesResponse.data.map((v) => v.member.id);
  TestValidator.predicate(
    "Member A voted",
    voterIds.includes(memberAAuthorized.id),
  );
  TestValidator.predicate(
    "Member B voted",
    voterIds.includes(memberBAuthorized.id),
  );
  TestValidator.predicate(
    "Member C voted",
    voterIds.includes(memberCAuthorized.id),
  );
  // Verify directions
  const memberAVote = votesResponse.data.find(
    (v) => v.member.id === memberAAuthorized.id,
  );
  const memberBVote = votesResponse.data.find(
    (v) => v.member.id === memberBAuthorized.id,
  );
  const memberCVote = votesResponse.data.find(
    (v) => v.member.id === memberCAuthorized.id,
  );
  TestValidator.equals("Member A upvoted", memberAVote?.direction, "upvote");
  TestValidator.equals("Member B upvoted", memberBVote?.direction, "upvote");
  TestValidator.equals(
    "Member C downvoted",
    memberCVote?.direction,
    "downvote",
  );
  // Votes should be ordered by created_at descending (newest first)
  // Member B voted last (their own upvote was cast last)
  TestValidator.equals(
    "Member B voted most recently",
    votesResponse.data[0].member.id,
    memberBAuthorized.id,
  );
  // Response should be paginated with pagination metadata
  TestValidator.predicate("has pagination info", !!votesResponse.pagination);
  TestValidator.equals(
    "pagination records count",
    votesResponse.pagination.records,
    3,
  );
}
