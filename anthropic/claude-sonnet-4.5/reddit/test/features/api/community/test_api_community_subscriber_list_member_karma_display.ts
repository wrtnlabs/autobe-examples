import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test that subscriber list correctly displays subscribed members.
 *
 * This test validates the complete workflow of:
 *
 * 1. Creating member accounts
 * 2. Creating a community
 * 3. Members subscribing to the community
 * 4. Retrieving subscriber list and verifying members appear correctly
 *
 * Note: The subscriber list returns member summaries (id, username, avatar_url)
 * and does not include karma information in the summary view.
 */
export async function test_api_community_subscriber_list_member_karma_display(
  connection: api.IConnection,
) {
  // Step 1: Create the first member who will create the community
  const member1Data = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member1: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: member1Data });
  typia.assert(member1);

  // Step 2: Create a community for testing subscriber list
  const communityData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post from member1
  const post1Data = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: post1Data,
    });
  typia.assert(post1);

  // Step 4: Create second member (new connection needed for different user)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const member2Data = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass456!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member2: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(unauthConnection, {
      body: member2Data,
    });
  typia.assert(member2);

  // Step 5: Member2 upvotes member1's post (this increases member1's post_karma)
  const vote1Data = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const vote1: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(
      unauthConnection,
      {
        postId: post1.id,
        body: vote1Data,
      },
    );
  typia.assert(vote1);

  // Step 6: Member2 subscribes to the community
  const subscription2: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      unauthConnection,
      { communityId: community.id },
    );
  typia.assert(subscription2);

  // Step 7: Member1 subscribes to the community
  const subscription1: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      connection,
      { communityId: community.id },
    );
  typia.assert(subscription1);

  // Step 8: Create third member
  const unauthConnection2: api.IConnection = { ...connection, headers: {} };

  const member3Data = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass789!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member3: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(unauthConnection2, {
      body: member3Data,
    });
  typia.assert(member3);

  // Step 9: Member3 creates a post
  const post2Data = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(unauthConnection2, {
      body: post2Data,
    });
  typia.assert(post2);

  // Step 10: Member1 upvotes member3's post
  const vote2Data = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;

  const vote2: IRedditLikePostVote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: post2.id,
      body: vote2Data,
    });
  typia.assert(vote2);

  // Step 11: Member3 subscribes to the community
  const subscription3: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      unauthConnection2,
      { communityId: community.id },
    );
  typia.assert(subscription3);

  // Step 12: Retrieve the subscriber list
  const subscriberList: IPageIRedditLikeMember.ISummary =
    await api.functional.redditLike.communities.subscriptions.index(
      connection,
      { communityId: community.id },
    );
  typia.assert(subscriberList);

  // Step 13: Validate subscriber list contains all three members
  TestValidator.predicate(
    "subscriber count should be at least 3",
    subscriberList.data.length >= 3,
  );

  // Step 14: Verify that subscriber list contains member summaries with proper structure
  TestValidator.predicate(
    "all subscribers should have id and username",
    subscriberList.data.every(
      (member) =>
        member.id !== undefined &&
        member.id !== null &&
        member.username !== undefined &&
        member.username !== null,
    ),
  );

  // Step 15: Verify all three created members appear in the subscriber list
  const subscriberIds = subscriberList.data.map((m) => m.id);

  TestValidator.predicate(
    "member1 should be in subscriber list",
    subscriberIds.includes(member1.id),
  );

  TestValidator.predicate(
    "member2 should be in subscriber list",
    subscriberIds.includes(member2.id),
  );

  TestValidator.predicate(
    "member3 should be in subscriber list",
    subscriberIds.includes(member3.id),
  );

  // Step 16: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid structure",
    subscriberList.pagination.records >= 3 &&
      subscriberList.pagination.current >= 0 &&
      subscriberList.pagination.limit > 0,
  );
}
