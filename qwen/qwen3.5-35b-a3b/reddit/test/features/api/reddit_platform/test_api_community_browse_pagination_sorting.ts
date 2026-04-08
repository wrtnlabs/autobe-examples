import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browse_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Test default sorting (subscriber_count desc)
  const defaultResponse = await api.functional.redditPlatform.communities.index(
    userConnection,
    { body: {} },
  );
  typia.assert(defaultResponse);
  // Step 2: Test sorting by created_at descending (newest first)
  const createdDescResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(createdDescResponse);
  // Step 3: Test sorting by created_at ascending (oldest first)
  const createdAscResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(createdAscResponse);
  // Step 4: Test sorting by name (alphabetical)
  const nameAscResponse = await api.functional.redditPlatform.communities.index(
    userConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(nameAscResponse);
  const nameDescResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: {
        sortBy: "name",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(nameDescResponse);
  // Step 5: Test pagination with page=2 and limit=10
  const page2Response = await api.functional.redditPlatform.communities.index(
    userConnection,
    {
      body: { page: 2, limit: 10 } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2Response);
  // Step 6: Test pagination with different limit (50)
  const limit50Response = await api.functional.redditPlatform.communities.index(
    userConnection,
    {
      body: { limit: 50 } satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(limit50Response);
  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "pagination metadata current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination metadata limit",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination metadata records positive",
    page2Response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination metadata pages positive",
    page2Response.pagination.pages > 0,
  );
  // Step 8: Test page_size parameter
  const pageSizeResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: {
        page: 1,
        page_size: 25,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(pageSizeResponse);
  // Step 9: Test boundary conditions - page=1 (first page)
  const firstPageResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: { page: 1, limit: 10 } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page current is 1",
    firstPageResponse.pagination.current,
    1,
  );
  // Step 10: Test subscriber filtering combined with sorting
  const filteredResponse =
    await api.functional.redditPlatform.communities.index(userConnection, {
      body: {
        min_subscribers: 0,
        max_subscribers: 1000,
        sortBy: "subscriber_count",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(filteredResponse);
  // Step 11: Validate that pagination respects sorting within each page
  if (createdDescResponse.data.length > 1) {
    TestValidator.predicate(
      "created_at desc order maintained",
      createdDescResponse.data.every((community, index) =>
        index === 0
          ? true
          : new Date(community.created_at) <=
            new Date(createdDescResponse.data[index - 1].created_at),
      ),
    );
  }
  if (nameAscResponse.data.length > 1) {
    TestValidator.predicate(
      "name asc order maintained",
      nameAscResponse.data.every((community, index) =>
        index === 0
          ? true
          : community.name >= nameAscResponse.data[index - 1].name,
      ),
    );
  }
}
