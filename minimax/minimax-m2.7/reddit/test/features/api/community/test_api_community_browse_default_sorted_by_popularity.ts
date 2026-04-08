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

export async function test_api_community_browse_default_sorted_by_popularity(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Browse communities without filters (page 1)
  const page1 = await api.functional.redditClone.communities.discover.index(
    connection,
    {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 limit positive", page1.pagination.limit > 0);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  // Validate pagination calculation
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      page1.pagination.pages,
      expectedPages,
    );
  }
  // Validate each community has required fields
  for (const community of page1.data) {
    typia.assert(community);
    TestValidator.predicate("community has valid id", community.id.length > 0);
    TestValidator.predicate("community has name", community.name.length > 0);
    TestValidator.predicate(
      "community has description",
      community.description !== undefined,
    );
    TestValidator.predicate(
      "subscriber count is non-negative",
      community.subscriberCount >= 0,
    );
    TestValidator.predicate(
      "owner exists",
      community.owner !== null && community.owner !== undefined,
    );
    TestValidator.predicate("owner has id", community.owner.id.length > 0);
    TestValidator.predicate(
      "owner has username",
      community.owner.username.length > 0,
    );
  }
  // Test 2: Verify default sorting by subscriberCount descending
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      TestValidator.predicate(
        `community ${i} subscriber count >= community ${i + 1}`,
        page1.data[i].subscriberCount >= page1.data[i + 1].subscriberCount,
      );
    }
  }
  // Test 3: Test pagination - request page 2
  const pageSize = 5;
  const page2 = await api.functional.redditClone.communities.discover.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneCommunity.IRequest,
    },
  );
  typia.assert(page2);
  // Validate page 2 pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, pageSize);
  // If there are enough records for pagination, validate results differ
  if (page1.pagination.records > pageSize) {
    TestValidator.notEquals(
      "page 1 and page 2 data differ",
      page1.data,
      page2.data,
    );
  }
  // Test 4: Explicitly request sortBy subscriberCount to confirm it works
  const sortedBySubscriberCount =
    await api.functional.redditClone.communities.discover.index(connection, {
      body: {
        sortBy: "subscriberCount" as "name" | "subscriberCount" | "createdAt",
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(sortedBySubscriberCount);
  // Verify sorting is still by subscriber count descending
  if (sortedBySubscriberCount.data.length > 1) {
    for (let i = 0; i < sortedBySubscriberCount.data.length - 1; i++) {
      TestValidator.predicate(
        `sorted by subscriberCount: community ${i} >= ${i + 1}`,
        sortedBySubscriberCount.data[i].subscriberCount >=
          sortedBySubscriberCount.data[i + 1].subscriberCount,
      );
    }
  }
}
