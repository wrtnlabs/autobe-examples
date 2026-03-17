import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browse_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Browse communities with default pagination parameters
  const defaultResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page is valid",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // Validate communities array
  TestValidator.predicate("data is array", Array.isArray(defaultResponse.data));
  // Validate each community in the response
  for (const community of defaultResponse.data) {
    TestValidator.predicate("community has valid id", community.id.length > 0);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "community has description",
      community.description.length > 0,
    );
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    // Validate owner information
    TestValidator.predicate("owner has id", community.owner.id.length > 0);
    TestValidator.predicate(
      "owner has username",
      community.owner.username.length > 0,
    );
    TestValidator.predicate(
      "owner has display name",
      community.owner.display_name.length > 0,
    );
    TestValidator.predicate(
      "owner has karma score",
      community.owner.karma_score >= 0,
    );
  }
  // Test 2: Browse with explicit pagination parameters (page 1, limit 10)
  const paginatedResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "subscriber_count",
        order: "desc",
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  // Verify pagination metadata
  TestValidator.equals("current page", paginatedResponse.pagination.current, 1);
  TestValidator.equals("limit", paginatedResponse.pagination.limit, 10);
  // Verify sorting: communities should be sorted by subscriber_count descending
  if (paginatedResponse.data.length > 1) {
    for (let i = 0; i < paginatedResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "communities sorted by subscriber_count desc",
        paginatedResponse.data[i].subscriber_count >=
          paginatedResponse.data[i + 1].subscriber_count,
      );
    }
  }
  // Test 3: Browse with search parameter
  const searchResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        search: "test",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate search results - all returned communities should contain "test" in name
  for (const community of searchResponse.data) {
    TestValidator.predicate(
      "community name contains search term",
      community.name.toLowerCase().includes("test"),
    );
  }
  // Test 4: Browse with created_at sorting
  const sortedByDateResponse =
    await api.functional.redditClone.communities.index(connection, {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 15,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(sortedByDateResponse);
  // Verify date sorting: communities should be sorted by created_at descending
  if (sortedByDateResponse.data.length > 1) {
    for (let i = 0; i < sortedByDateResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "communities sorted by created_at desc",
        new Date(sortedByDateResponse.data[i].created_at).getTime() >=
          new Date(sortedByDateResponse.data[i + 1].created_at).getTime(),
      );
    }
  }
}
