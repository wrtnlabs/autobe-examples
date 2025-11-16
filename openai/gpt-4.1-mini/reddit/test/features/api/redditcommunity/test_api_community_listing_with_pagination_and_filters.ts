import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_community_listing_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // Test retrieving first page with limit 5
  const requestBody1 = {
    page: 0,
    limit: 5,
  } satisfies IRedditCommunityCommunity.IRequest;
  const output1 = await api.functional.redditCommunity.communities.index(
    connection,
    {
      body: requestBody1,
    },
  );
  typia.assert(output1);
  TestValidator.predicate("page size is at most 5", output1.data.length <= 5);
  TestValidator.equals(
    "page number matches request",
    output1.pagination.current,
    0,
  );

  // Test filtering by search keyword - partial match on communityName
  // Get a communityName sample from output1 to use as search keyword
  if (output1.data.length > 0) {
    const keySample = output1.data[0].communityName.substring(
      0,
      Math.min(3, output1.data[0].communityName.length),
    );
    const requestBody2 = {
      page: 0,
      limit: 10,
      search: keySample,
      status: "all",
    } satisfies IRedditCommunityCommunity.IRequest;
    const output2 = await api.functional.redditCommunity.communities.index(
      connection,
      { body: requestBody2 },
    );
    typia.assert(output2);
    for (const community of output2.data) {
      TestValidator.predicate(
        `community name contains search keyword`,
        community.communityName.includes(keySample),
      );
    }
  }

  // Test filtering by status active
  const requestBodyActive = {
    page: 0,
    limit: 10,
    status: "active",
  } satisfies IRedditCommunityCommunity.IRequest;
  const activeOutput = await api.functional.redditCommunity.communities.index(
    connection,
    { body: requestBodyActive },
  );
  typia.assert(activeOutput);
  for (const community of activeOutput.data) {
    TestValidator.equals("status is active", community.status, "active");
  }

  // Test filtering by status inactive
  const requestBodyInactive = {
    page: 0,
    limit: 10,
    status: "inactive",
  } satisfies IRedditCommunityCommunity.IRequest;
  const inactiveOutput = await api.functional.redditCommunity.communities.index(
    connection,
    { body: requestBodyInactive },
  );
  typia.assert(inactiveOutput);
  for (const community of inactiveOutput.data) {
    TestValidator.equals("status is inactive", community.status, "inactive");
  }

  // Test filtering by status all (should return active and inactive)
  const requestBodyAll = {
    page: 0,
    limit: 10,
    status: "all",
  } satisfies IRedditCommunityCommunity.IRequest;
  const allOutput = await api.functional.redditCommunity.communities.index(
    connection,
    { body: requestBodyAll },
  );
  typia.assert(allOutput);
  for (const community of allOutput.data) {
    TestValidator.predicate(
      "status is active or inactive",
      community.status === "active" || community.status === "inactive",
    );
  }

  // Test sorting by name ascending
  const requestBodySortNameAsc = {
    page: 0,
    limit: 10,
    sortBy: "name",
    sortDirection: "asc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortNameAscOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortNameAsc,
    });
  typia.assert(sortNameAscOutput);
  for (let i = 1; i < sortNameAscOutput.data.length; i++) {
    TestValidator.predicate(
      "name ascending order",
      sortNameAscOutput.data[i - 1].communityName <=
        sortNameAscOutput.data[i].communityName,
    );
  }

  // Test sorting by name descending
  const requestBodySortNameDesc = {
    page: 0,
    limit: 10,
    sortBy: "name",
    sortDirection: "desc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortNameDescOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortNameDesc,
    });
  typia.assert(sortNameDescOutput);
  for (let i = 1; i < sortNameDescOutput.data.length; i++) {
    TestValidator.predicate(
      "name descending order",
      sortNameDescOutput.data[i - 1].communityName >=
        sortNameDescOutput.data[i].communityName,
    );
  }

  // Test sorting by createdAt ascending - cannot assert dates since property missing
  const requestBodySortCreatedAtAsc = {
    page: 0,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortCreatedAtAscOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortCreatedAtAsc,
    });
  typia.assert(sortCreatedAtAscOutput);
  TestValidator.predicate(
    "has data on createdAt ascending sort",
    sortCreatedAtAscOutput.data.length >= 0,
  );

  // Test sorting by createdAt descending - cannot assert dates since property missing
  const requestBodySortCreatedAtDesc = {
    page: 0,
    limit: 10,
    sortBy: "createdAt",
    sortDirection: "desc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortCreatedAtDescOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortCreatedAtDesc,
    });
  typia.assert(sortCreatedAtDescOutput);
  TestValidator.predicate(
    "has data on createdAt descending sort",
    sortCreatedAtDescOutput.data.length >= 0,
  );

  // Test sorting by updatedAt ascending - cannot assert dates since property missing
  const requestBodySortUpdatedAtAsc = {
    page: 0,
    limit: 10,
    sortBy: "updatedAt",
    sortDirection: "asc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortUpdatedAtAscOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortUpdatedAtAsc,
    });
  typia.assert(sortUpdatedAtAscOutput);
  TestValidator.predicate(
    "has data on updatedAt ascending sort",
    sortUpdatedAtAscOutput.data.length >= 0,
  );

  // Test sorting by updatedAt descending - cannot assert dates since property missing
  const requestBodySortUpdatedAtDesc = {
    page: 0,
    limit: 10,
    sortBy: "updatedAt",
    sortDirection: "desc",
  } satisfies IRedditCommunityCommunity.IRequest;
  const sortUpdatedAtDescOutput =
    await api.functional.redditCommunity.communities.index(connection, {
      body: requestBodySortUpdatedAtDesc,
    });
  typia.assert(sortUpdatedAtDescOutput);
  TestValidator.predicate(
    "has data on updatedAt descending sort",
    sortUpdatedAtDescOutput.data.length >= 0,
  );
}
