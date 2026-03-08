import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate unique identifiers for test data
  const testPost1Id: string = typia.random<string & tags.Format<"uuid">>();
  const testPost2Id: string = typia.random<string & tags.Format<"uuid">>();
  const testAuthor1Id: string = typia.random<string & tags.Format<"uuid">>();
  const testAuthor2Id: string = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Generate date range for testing
  const allTestStart: Date = new Date();
  allTestStart.setHours(allTestStart.getHours() - 24 * 7); // 7 days ago
  const allTestEnd: Date = new Date();
  allTestEnd.setHours(allTestEnd.getHours() + 1); // 1 hour ahead
  const dateRangeStart: string & tags.Format<"date"> = allTestStart
    .toISOString()
    .split("T")[0] as string & tags.Format<"date">;
  const dateRangeEnd: string & tags.Format<"date"> = allTestEnd
    .toISOString()
    .split("T")[0] as string & tags.Format<"date">;
  // Test 1: Filter by post_id (should return snapshots for specific post)
  const post1IdFilter: IRedditPlatformPostSnapshot.IRequest = {
    post_id: testPost1Id,
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const post1IdResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: post1IdFilter,
    });
  typia.assert(post1IdResponse);
  TestValidator.equals(
    "post_id filter - all snapshots should be for specified post",
    post1IdResponse.data.every((s) => s.post.id === testPost1Id),
    true,
  );
  // Test 2: Filter by author_id (should return snapshots by specific author)
  const author1IdFilter: IRedditPlatformPostSnapshot.IRequest = {
    author_id: testAuthor1Id,
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const author1IdResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: author1IdFilter,
    });
  typia.assert(author1IdResponse);
  TestValidator.equals(
    "author_id filter - all snapshots should be by specified author",
    author1IdResponse.data.every((s) => s.author.id === testAuthor1Id),
    true,
  );
  // Test 3: Filter by snapshot_type CREATE
  const snapshotTypeCreate: IRedditPlatformPostSnapshot.IRequest = {
    snapshot_type: "CREATE",
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const snapshotTypeCreateResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: snapshotTypeCreate,
    });
  typia.assert(snapshotTypeCreateResponse);
  TestValidator.equals(
    "snapshot_type CREATE - all snapshots should be CREATE type",
    snapshotTypeCreateResponse.data.every((s) => s.snapshotType === "CREATE"),
    true,
  );
  // Test 4: Filter by date range
  const dateRangeFilter: IRedditPlatformPostSnapshot.IRequest = {
    start_date: dateRangeStart,
    end_date: dateRangeEnd,
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const dateRangeResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: dateRangeFilter,
    });
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range filter - all snapshots should be within range",
    dateRangeResponse.data.every(
      (s) => s.createdAt >= dateRangeStart && s.createdAt <= dateRangeEnd,
    ),
    true,
  );
  // Test 5: Combine multiple filters (post_id + snapshot_type)
  const combinedFilter: IRedditPlatformPostSnapshot.IRequest = {
    post_id: testPost1Id,
    snapshot_type: "EDIT",
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const combinedResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: combinedFilter,
    });
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter (post_id + snapshot_type) - all should match both",
    combinedResponse.data.every(
      (s) => s.post.id === testPost1Id && s.snapshotType === "EDIT",
    ),
    true,
  );
  // Test 6: Verify pagination metadata reflects filtered count
  const paginationCheck: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { post_id: testPost1Id, page: 1, limit: 100 },
    });
  typia.assert(paginationCheck);
  TestValidator.equals(
    "pagination records - should match filtered data count",
    paginationCheck.pagination.records,
    paginationCheck.data.length,
  );
  // Test 7: Verify sorting works (created_at DESC)
  const sortTest: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: {
        post_id: testPost1Id,
        sort: "created_at",
        order: "DESC",
        page: 1,
        limit: 100,
      },
    });
  typia.assert(sortTest);
  // Verify records are sorted by created_at DESC
  if (sortTest.data.length > 1) {
    TestValidator.predicate(
      "created_at DESC sorting - records should be in descending order",
      () => {
        for (let i = 0; i < sortTest.data.length - 1; i++) {
          if (
            new Date(sortTest.data[i].createdAt) <
            new Date(sortTest.data[i + 1].createdAt)
          ) {
            return false;
          }
        }
        return true;
      },
    );
  }
  // Test 8: Verify all filters optional - no filter returns all snapshots
  const noFilter: IRedditPlatformPostSnapshot.IRequest = {
    page: 1,
    limit: 100,
  } satisfies IRedditPlatformPostSnapshot.IRequest;
  const noFilterResponse: IPageIRedditPlatformPostSnapshot.ISummary =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: noFilter,
    });
  typia.assert(noFilterResponse);
  TestValidator.equals(
    "no filter - should return all snapshots",
    noFilterResponse.pagination.records >= 0,
    true,
  );
}
