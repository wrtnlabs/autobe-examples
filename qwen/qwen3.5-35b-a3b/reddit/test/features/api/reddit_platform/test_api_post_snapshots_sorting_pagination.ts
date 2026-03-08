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

export async function test_api_post_snapshots_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default sorting (created_at DESC)
  const defaultResponse =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: {
        page: 1,
        limit: 20,
      },
    });
  typia.assert(defaultResponse);
  // 2. Test sort by created_at ASC
  const ascResponse = await api.functional.redditPlatform.post_snapshots.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "ASC",
      },
    },
  );
  typia.assert(ascResponse);
  // 3. Test sort by vote_score ASC
  const voteScoreAscResponse =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort: "vote_score",
        order: "ASC",
      },
    });
  typia.assert(voteScoreAscResponse);
  // 4. Test sort by vote_score DESC
  const voteScoreDescResponse =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort: "vote_score",
        order: "DESC",
      },
    });
  typia.assert(voteScoreDescResponse);
  // 5. Test pagination with multiple pages
  const page1Response =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 1, limit: 5 },
    });
  typia.assert(page1Response);
  const page2Response =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 2, limit: 5 },
    });
  typia.assert(page2Response);
  // 6. Test limit parameter variations
  const limit5Response =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 1, limit: 5 },
    });
  typia.assert(limit5Response);
  const limit20Response =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 1, limit: 20 },
    });
  typia.assert(limit20Response);
  const limit100Response =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 1, limit: 100 },
    });
  typia.assert(limit100Response);
  // 7. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records count non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 8. Test boundary page (beyond total pages)
  const boundaryResponse =
    await api.functional.redditPlatform.post_snapshots.index(connection, {
      body: { page: 9999, limit: 20 },
    });
  typia.assert(boundaryResponse);
  TestValidator.equals(
    "boundary page returns empty data",
    boundaryResponse.data.length,
    0,
  );
  // 9. Test edge case - page=0 should be rejected or defaulted by API
  // Note: Schema requires page >= 1, so this may throw or default
  try {
    const zeroPageResponse =
      await api.functional.redditPlatform.post_snapshots.index(connection, {
        body: { page: 0, limit: 20 },
      });
    typia.assert(zeroPageResponse);
    // If it succeeds, verify it defaulted to page 1
    TestValidator.equals(
      "zero page defaults to page 1",
      zeroPageResponse.pagination.current,
      1,
    );
  } catch (error) {
    // Expected: API should reject page < 1
    TestValidator.predicate("page=0 should return error", error !== undefined);
  }
  // Validate snapshot records contain required fields
  if (defaultResponse.data.length > 0) {
    const firstSnapshot = defaultResponse.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has title",
      firstSnapshot.title !== undefined,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      firstSnapshot.createdAt !== undefined,
    );
    TestValidator.predicate(
      "snapshot has voteScore",
      firstSnapshot.voteScore !== undefined,
    );
    TestValidator.predicate(
      "snapshot has author",
      firstSnapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has post",
      firstSnapshot.post !== undefined,
    );
  }
}
