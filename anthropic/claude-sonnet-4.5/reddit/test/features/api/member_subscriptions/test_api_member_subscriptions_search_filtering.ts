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
 * Test the search functionality for filtering a member's subscriptions by
 * community name.
 *
 * This test validates that:
 *
 * 1. Members can search their subscribed communities by name
 * 2. Search is case-insensitive
 * 3. Partial matching works correctly (e.g., "tech" matches "technology" and
 *    "tech_news")
 * 4. Search functionality integrates properly with pagination
 *
 * The test creates a member, subscribes them to communities with diverse names,
 * then verifies that search queries return the correct filtered results.
 */
export async function test_api_member_subscriptions_search_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 2: Create moderator account for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create communities with specific naming patterns
  const communityNames = [
    "technology",
    "tech_news",
    "science",
    "gaming",
  ] as const;
  const communities: IRedditCommunityCommunity[] = [];

  for (const name of communityNames) {
    const community: IRedditCommunityCommunity =
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: name,
            display_title: name.charAt(0).toUpperCase() + name.slice(1),
            description: `Community about ${name}`,
            rules: "Be respectful and stay on topic",
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Step 4: Switch to member account and subscribe to all communities
  await api.functional.auth.member.login(connection, {
    body: {
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  for (const community of communities) {
    const subscription: IRedditCommunityCommunitySubscription =
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
        },
      );
    typia.assert(subscription);
  }

  // Step 5: Test search for "tech" - should return both "technology" and "tech_news"
  const techSearchResult: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          search: "tech",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(techSearchResult);

  TestValidator.predicate(
    "search 'tech' should return at least 2 results",
    techSearchResult.data.length >= 2,
  );

  const techCommunityNames = techSearchResult.data.map((c) => c.name);
  TestValidator.predicate(
    "search 'tech' should include 'technology'",
    techCommunityNames.includes("technology"),
  );
  TestValidator.predicate(
    "search 'tech' should include 'tech_news'",
    techCommunityNames.includes("tech_news"),
  );

  // Step 6: Test search for "science" - should return only "science"
  const scienceSearchResult: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          search: "science",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(scienceSearchResult);

  TestValidator.equals(
    "search 'science' should return exactly 1 result",
    scienceSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'science' should return the science community",
    scienceSearchResult.data[0].name,
    "science",
  );

  // Step 7: Test case-insensitive search with "TECH"
  const techUpperSearchResult: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          search: "TECH",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(techUpperSearchResult);

  TestValidator.equals(
    "case-insensitive: 'TECH' should return same count as 'tech'",
    techUpperSearchResult.data.length,
    techSearchResult.data.length,
  );

  // Step 8: Test pagination with search
  const paginatedSearchResult: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          search: "tech",
          page: 1,
          limit: 1,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedSearchResult);

  TestValidator.equals(
    "pagination with limit 1 should return exactly 1 result",
    paginatedSearchResult.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination metadata should indicate total records >= 2",
    paginatedSearchResult.pagination.records >= 2,
  );

  // Step 9: Test retrieval without search - should return all subscriptions
  const allSubscriptionsResult: IPageIRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptionsResult);

  TestValidator.equals(
    "no search filter should return all 4 subscriptions",
    allSubscriptionsResult.data.length,
    4,
  );
}
