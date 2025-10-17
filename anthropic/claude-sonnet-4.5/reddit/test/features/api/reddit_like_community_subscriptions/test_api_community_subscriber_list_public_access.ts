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

/**
 * Test that the subscriber list for a public community can be retrieved by any
 * user including unauthenticated guests.
 *
 * This test validates the transparency requirement for public communities where
 * subscriber lists should be accessible to everyone without authentication. The
 * test creates a public community, populates it with multiple subscribers, and
 * then verifies that the subscriber list can be retrieved without any
 * authentication credentials.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts (creator + subscribers)
 * 2. Create a public community with the first member
 * 3. Subscribe additional members to the community
 * 4. Create an unauthenticated connection
 * 5. Retrieve the subscriber list without authentication
 * 6. Validate response structure and subscriber data
 * 7. Verify pagination information is correct
 */
export async function test_api_community_subscriber_list_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create the first member who will create the community
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(creator);

  // Step 2: Create a public community (creator is automatically authenticated after join)
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: `test_${RandomGenerator.alphaNumeric(10)}`,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create additional members and subscribe them to the community
  const additionalMemberCount = 4;
  const allMemberIds: string[] = [creator.id];

  for (let i = 0; i < additionalMemberCount; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: `member_${i}_${RandomGenerator.alphaNumeric(8)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(member);
    allMemberIds.push(member.id);

    // Subscribe this member to the community
    const subscription =
      await api.functional.redditLike.member.communities.subscribe.create(
        connection,
        {
          communityId: community.id,
        },
      );
    typia.assert(subscription);
  }

  const totalExpectedSubscribers = additionalMemberCount + 1;

  // Step 4: Create an unauthenticated connection (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Retrieve the subscriber list without authentication
  const subscriberList =
    await api.functional.redditLike.communities.subscriptions.index(
      unauthConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscriberList);

  // Step 6: Validate response structure and subscriber data
  TestValidator.predicate(
    "subscriber list data should be an array",
    Array.isArray(subscriberList.data),
  );

  TestValidator.equals(
    "subscriber list should contain exactly all subscribed members",
    subscriberList.data.length,
    totalExpectedSubscribers,
  );

  // Step 7: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid structure",
    subscriberList.pagination !== null &&
      subscriberList.pagination !== undefined,
  );

  TestValidator.equals(
    "total records should match subscriber count",
    subscriberList.pagination.records,
    totalExpectedSubscribers,
  );

  TestValidator.predicate(
    "pagination current page should be valid",
    subscriberList.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    subscriberList.pagination.limit > 0,
  );

  // Validate that all subscribed members appear in the list
  const subscriberIds = subscriberList.data.map((s) => s.id);

  for (const memberId of allMemberIds) {
    TestValidator.predicate(
      "all subscribed members should appear in subscriber list",
      subscriberIds.includes(memberId),
    );
  }

  // Validate subscriber summary structure for each subscriber
  for (const subscriber of subscriberList.data) {
    TestValidator.predicate(
      "subscriber should have valid UUID id",
      typeof subscriber.id === "string" && subscriber.id.length > 0,
    );

    TestValidator.predicate(
      "subscriber should have username",
      typeof subscriber.username === "string" && subscriber.username.length > 0,
    );
  }
}
