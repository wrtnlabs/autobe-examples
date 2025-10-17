import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscription";

export async function test_api_subscription_search_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create and manage subscriptions
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const username: string = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string = typia.random<
    string & tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: username,
        password: password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);

  // 2. Create multiple communities to subscribe to
  const community1Name: string = RandomGenerator.alphaNumeric(8);
  const community2Name: string = RandomGenerator.alphaNumeric(8);
  const community3Name: string = RandomGenerator.alphaNumeric(8);

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: community1Name,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: community2Name,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);

  const community3: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: community3Name,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);

  // 3. Subscribe to the three communities
  const subscription1: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community1.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription1);

  const subscription2: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community2.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription2);

  const subscription3: ICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.create(
      connection,
      {
        body: {
          community_id: community3.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription3);

  // 4. Search for all active subscriptions with default pagination and sorting
  const searchResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {},
      },
    );
  typia.assert(searchResponse);

  // Validate pagination
  TestValidator.equals(
    "pagination should have default limit 50",
    searchResponse.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pagination should have default page 1",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination should have 3 records",
    searchResponse.pagination.records === 3,
  );
  TestValidator.predicate(
    "pagination should have 1 page for 3 records",
    searchResponse.pagination.pages === 1,
  );

  // Validate data contains all three subscriptions
  TestValidator.equals(
    "should have 3 subscriptions",
    searchResponse.data.length,
    3,
  );

  // Validate each subscription has correct member_id
  const memberIds = searchResponse.data.map((s) => s.member_id);
  TestValidator.predicate(
    "all subscriptions should belong to the member",
    memberIds.every((id) => id === member.id),
  );

  // Validate all subscriptions are active
  TestValidator.predicate(
    "all subscriptions should be active",
    searchResponse.data.every((s) => s.active === true),
  );

  // 5. Search with active status filter
  const activeResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(activeResponse);
  TestValidator.equals(
    "active filter should return 3 subscriptions",
    activeResponse.data.length,
    3,
  );
  TestValidator.predicate(
    "all subscriptions should be active",
    activeResponse.data.every((s) => s.active === true),
  );

  // 6. Search with inactive status filter (should return empty)
  const inactiveResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          status: "inactive",
        },
      },
    );
  typia.assert(inactiveResponse);
  TestValidator.equals(
    "inactive filter should return 0 subscriptions",
    inactiveResponse.data.length,
    0,
  );

  // 7. Search with pagination - limit 1, page 1
  const limit1Page1: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(limit1Page1);
  TestValidator.equals(
    "limit 1 should return 1 subscription",
    limit1Page1.data.length,
    1,
  );
  TestValidator.equals(
    "page 1 should be current page",
    limit1Page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records should be 3",
    limit1Page1.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages should be 3",
    limit1Page1.pagination.pages,
    3,
  );

  // 8. Search with pagination - limit 1, page 2
  const limit1Page2: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          limit: 1,
          page: 2,
        },
      },
    );
  typia.assert(limit1Page2);
  TestValidator.equals(
    "limit 1, page 2 should return 1 subscription",
    limit1Page2.data.length,
    1,
  );
  TestValidator.equals(
    "page 2 should be current page",
    limit1Page2.pagination.current,
    2,
  );

  // 9. Search with sort by created_at descending (default)
  const sortedResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {},
      },
    );
  typia.assert(sortedResponse);

  // Verify subscriptions are sorted by created_at in descending order
  const sortedDates = sortedResponse.data.map((s) => new Date(s.created_at));
  TestValidator.predicate(
    "subscriptions should be sorted by created_at descending",
    sortedDates.every(
      (date, index, array) => index === 0 || date >= array[index - 1],
    ),
  );

  // 10. Search with search term for community name
  const searchNameResponse: IPageICommunityPlatformSubscription =
    await api.functional.communityPlatform.member.subscriptions.search(
      connection,
      {
        body: {
          search: community1Name.substring(0, 3), // Partial match on first 3 characters
        },
      },
    );
  typia.assert(searchNameResponse);

  // Should return subscription to community1
  TestValidator.equals(
    "search by name should return 1 subscription",
    searchNameResponse.data.length,
    1,
  );
  TestValidator.equals(
    "search should match community1",
    searchNameResponse.data[0].community_id,
    community1.id,
  );
}
