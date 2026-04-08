import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that soft-deleted votes return 404 when retrieved via API.
 *
 * Validates the complete vote lifecycle including creation, soft deletion, and retrieval restrictions. Ensures that when a vote is removed (soft-deleted by setting vote_type to null), attempting to retrieve the deleted vote returns HTTP 404 Not Found, while also verifying that the system allows recasting a new vote on the same post.
 *
 * This test confirms proper enforcement of soft-delete semantics for vote records and validates the business rule that each member can have exactly one active vote per post at any time.
 *
 * 1. Register and authenticate a member account to obtain session token.
 * 2. Browse available communities and select one to subscribe to.
 * 3. Subscribe the member to the selected community.
 * 4. Create a post in the subscribed community.
 * 5. Cast an initial upvote on the post and capture the vote ID.
 * 6. Remove the vote via PATCH endpoint with vote_type: null (soft delete).
 * 7. Attempt to retrieve the soft-deleted vote via GET endpoint → expect 404 Not Found.
 * 8. Cast a new vote on the same post → should succeed without duplicate constraint violation.
 */
export async function test_api_member_vote_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberAuthConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member connection for API calls (connection mutated by authorize function)
  const memberConnection: api.IConnection = { host: connection.host };
  // 3. Browse communities to find one to subscribe to
  const communities =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(communities);
  TestValidator.predicate("communities found", communities.data.length > 0);
  // 4. Subscribe to a community
  const community = communities.data[0];
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription status", subscription.status, "active");
  // 5. Create a post in the subscribed community
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
        reddit_community_community_id: community.id,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Cast an initial vote (upvote) on the post
  const initialVote =
    await api.functional.redditCommunity.member.posts.votes.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(initialVote);
  const voteId = initialVote.id;
  TestValidator.equals("initial vote type", initialVote.vote_type, "upvote");
  // 7. Remove the vote via PATCH with vote_type: null (soft delete)
  const removedVote =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId: post.id,
        body: {
          vote_type: null,
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(removedVote);
  TestValidator.equals("removed vote type", removedVote.vote_type, null);
  TestValidator.predicate("vote soft deleted", removedVote.deleted_at !== null);
  // 8. Attempt to retrieve the deleted vote via GET → expect 404
  await TestValidator.error("deleted vote returns 404", async () => {
    await api.functional.redditCommunity.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: voteId,
      },
    );
  });
  // 9. Cast a new vote on the same post (should succeed)
  const recastVote =
    await api.functional.redditCommunity.member.posts.votes.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(recastVote);
  TestValidator.equals("recast vote type", recastVote.vote_type, "downvote");
  TestValidator.notEquals("recast vote is new", recastVote.id, voteId);
}
