import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving a member's community subscriptions with pagination
 * parameters.
 *
 * This test validates the pagination functionality for member subscription
 * retrieval:
 *
 * 1. Creates moderator and member accounts
 * 2. Creates 18 communities via moderator
 * 3. Subscribes member to all 18 communities
 * 4. Tests pagination with different page sizes (limit=5, limit=10)
 * 5. Validates pagination metadata (current page, total pages, records, limit)
 * 6. Ensures all subscriptions are retrievable without duplicates or gaps
 * 7. Verifies correct number of items per page
 */
export async function test_api_member_subscriptions_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: "https://test.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create 18 communities
  const communityCount = 18;
  const communities: IRedditCommunityCommunity[] = await ArrayUtil.asyncRepeat(
    communityCount,
    async (index) => {
      const community: IRedditCommunityCommunity =
        await api.functional.redditCommunity.moderator.communities.create(
          connection,
          {
            body: {
              name: `test_community_${index}_${RandomGenerator.alphaNumeric(6)}`,
              display_title: `Test Community ${index + 1}`,
              description: RandomGenerator.paragraph({ sentences: 5 }),
              rules: RandomGenerator.paragraph({ sentences: 3 }),
              icon_url: null,
              banner_url: null,
            } satisfies IRedditCommunityCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    },
  );

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: "member123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: false,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Subscribe member to all 18 communities
  const subscriptions: IRedditCommunityCommunitySubscription[] =
    await ArrayUtil.asyncRepeat(communityCount, async (index) => {
      const subscription: IRedditCommunityCommunitySubscription =
        await api.functional.redditCommunity.member.communities.subscriptions.create(
          connection,
          {
            communityName: communities[index].name,
          },
        );
      typia.assert(subscription);
      return subscription;
    });

  // Step 5: Test pagination with limit=5
  const limit5 = 5;
  const expectedPages5 = Math.ceil(communityCount / limit5);

  const allSubscriptionsLimit5: IRedditCommunityCommunitySubscription[] = [];

  for (let page = 1; page <= expectedPages5; page++) {
    const result: IPageIRedditCommunityCommunitySubscription =
      await api.functional.redditCommunity.member.members.subscriptions.index(
        connection,
        {
          username: memberUsername,
          body: {
            page: page,
            limit: limit5,
          } satisfies IRedditCommunityCommunitySubscription.IRequest,
        },
      );
    typia.assert(result);

    // Validate pagination metadata
    TestValidator.equals(
      "current page matches",
      result.pagination.current,
      page - 1,
    );
    TestValidator.equals("limit matches", result.pagination.limit, limit5);
    TestValidator.equals(
      "total records",
      result.pagination.records,
      communityCount,
    );
    TestValidator.equals(
      "total pages",
      result.pagination.pages,
      expectedPages5,
    );

    // Validate data array size
    const expectedSize =
      page === expectedPages5
        ? communityCount - limit5 * (expectedPages5 - 1)
        : limit5;
    TestValidator.equals(
      `page ${page} item count`,
      result.data.length,
      expectedSize,
    );

    // Collect subscriptions
    allSubscriptionsLimit5.push(...result.data);
  }

  // Validate all subscriptions collected with limit=5
  TestValidator.equals(
    "all subscriptions collected (limit=5)",
    allSubscriptionsLimit5.length,
    communityCount,
  );

  // Validate no duplicates
  const subscriptionIds5 = allSubscriptionsLimit5.map((s) => s.id);
  const uniqueIds5 = Array.from(new Set(subscriptionIds5));
  TestValidator.equals(
    "no duplicate subscriptions (limit=5)",
    uniqueIds5.length,
    communityCount,
  );

  // Step 6: Test pagination with limit=10
  const limit10 = 10;
  const expectedPages10 = Math.ceil(communityCount / limit10);

  const allSubscriptionsLimit10: IRedditCommunityCommunitySubscription[] = [];

  for (let page = 1; page <= expectedPages10; page++) {
    const result: IPageIRedditCommunityCommunitySubscription =
      await api.functional.redditCommunity.member.members.subscriptions.index(
        connection,
        {
          username: memberUsername,
          body: {
            page: page,
            limit: limit10,
          } satisfies IRedditCommunityCommunitySubscription.IRequest,
        },
      );
    typia.assert(result);

    // Validate pagination metadata
    TestValidator.equals(
      "current page matches",
      result.pagination.current,
      page - 1,
    );
    TestValidator.equals("limit matches", result.pagination.limit, limit10);
    TestValidator.equals(
      "total records",
      result.pagination.records,
      communityCount,
    );
    TestValidator.equals(
      "total pages",
      result.pagination.pages,
      expectedPages10,
    );

    // Validate data array size
    const expectedSize =
      page === expectedPages10
        ? communityCount - limit10 * (expectedPages10 - 1)
        : limit10;
    TestValidator.equals(
      `page ${page} item count`,
      result.data.length,
      expectedSize,
    );

    // Collect subscriptions
    allSubscriptionsLimit10.push(...result.data);
  }

  // Validate all subscriptions collected with limit=10
  TestValidator.equals(
    "all subscriptions collected (limit=10)",
    allSubscriptionsLimit10.length,
    communityCount,
  );

  // Validate no duplicates
  const subscriptionIds10 = allSubscriptionsLimit10.map((s) => s.id);
  const uniqueIds10 = Array.from(new Set(subscriptionIds10));
  TestValidator.equals(
    "no duplicate subscriptions (limit=10)",
    uniqueIds10.length,
    communityCount,
  );
}
