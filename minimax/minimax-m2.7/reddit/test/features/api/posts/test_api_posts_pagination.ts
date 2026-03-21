import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_posts_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Get baseline to understand available data
  const allPostsResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        limit: 1,
        page: 1,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(allPostsResponse);
  const totalRecords = allPostsResponse.pagination.records;
  // Test 1: Default pagination (page 1)
  const page1Response = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: 1,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.predicate(
    "records >= 0",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate("limit positive", page1Response.pagination.limit > 0);
  TestValidator.predicate("pages >= 0", page1Response.pagination.pages >= 0);
  // Test 2: Custom page size (limit)
  const customLimit = 5;
  const smallPageResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: customLimit,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(smallPageResponse);
  TestValidator.equals(
    "custom limit matches",
    smallPageResponse.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data length <= limit",
    smallPageResponse.data.length <= customLimit,
  );
  // Test 3: Maximum page size (100)
  const maxLimitResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length <= 100",
    maxLimitResponse.data.length <= 100,
  );
  // Test 4: Sequential page navigation (no duplicates)
  if (totalRecords > 10) {
    const page1 = await api.functional.redditClone.posts.index(connection, {
      body: {
        page: 1,
        limit: 5,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    });
    typia.assert(page1);
    const page2 = await api.functional.redditClone.posts.index(connection, {
      body: {
        page: 2,
        limit: 5,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    });
    typia.assert(page2);
    const page1Ids = new Set(page1.data.map((p) => p.id));
    for (const id of page1Ids) {
      TestValidator.equals(
        "no overlap between pages",
        page2.data.some((p) => p.id === id),
        false,
      );
    }
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals(
      "page 2 metadata matches page 1",
      page2.pagination.limit,
      page1.pagination.limit,
    );
    TestValidator.equals(
      "total records consistent",
      page2.pagination.records,
      page1.pagination.records,
    );
  }
  // Test 5: Beyond available pages returns empty data
  const beyondLastPage = Math.max(1, totalRecords + 100);
  const emptyResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: beyondLastPage,
        limit: 10,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals("empty data array", emptyResponse.data.length, 0);
  TestValidator.equals(
    "total records unchanged",
    emptyResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "current page set correctly",
    emptyResponse.pagination.current,
    beyondLastPage,
  );
  // Test 6: Minimum limit (1)
  const minLimitResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals("min limit is 1", minLimitResponse.pagination.limit, 1);
  TestValidator.predicate(
    "data length <= 1",
    minLimitResponse.data.length <= 1,
  );
  // Test 7: Pages calculation validation
  const fullResponse = await api.functional.redditClone.posts.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(fullResponse);
  const calculatedPages = Math.ceil(
    fullResponse.pagination.records / fullResponse.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    fullResponse.pagination.pages,
    calculatedPages,
  );
}
