import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_sorting_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Sort by created_at descending (newest first)
  const descResult = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        sort: "created_at",
        order: "desc",
        limit: 100,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(descResult);
  // Verify descending order - newer profiles should come first
  for (let i = 1; i < descResult.data.length; i++) {
    TestValidator.predicate(
      "created_at descending order",
      descResult.data[i - 1].createdAt >= descResult.data[i].createdAt,
    );
  }
  // Test 2: Sort by created_at ascending (oldest first)
  const ascResult = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        sort: "created_at",
        order: "asc",
        limit: 100,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(ascResult);
  // Verify ascending order - older profiles should come first
  for (let i = 1; i < ascResult.data.length; i++) {
    TestValidator.predicate(
      "created_at ascending order",
      ascResult.data[i - 1].createdAt <= ascResult.data[i].createdAt,
    );
  }
  // Test 3: Sort by display_name alphabetically
  const nameResult = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        sort: "display_name",
        order: "asc",
        limit: 100,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(nameResult);
  // Verify alphabetical order of display names
  for (let i = 1; i < nameResult.data.length; i++) {
    TestValidator.predicate(
      "display_name alphabetical order",
      nameResult.data[i - 1].displayName.localeCompare(
        nameResult.data[i].displayName,
      ) <= 0,
    );
  }
  // Test 4: Date filtering with created_after
  if (descResult.data.length > 0) {
    const newestProfile = descResult.data[0];
    const createdAfterDate = newestProfile.createdAt;
    const filteredAfterResult = await api.functional.redditClone.profiles.index(
      connection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          created_after: createdAfterDate,
          limit: 100,
        } satisfies IRedditCloneUserProfile.IRequest,
      },
    );
    typia.assert(filteredAfterResult);
    // All returned profiles should have createdAt >= the filter date
    for (const profile of filteredAfterResult.data) {
      TestValidator.predicate(
        "created_after filter",
        profile.createdAt >= createdAfterDate,
      );
    }
  }
  // Test 5: Date filtering with created_before
  if (ascResult.data.length > 0) {
    const oldestProfile = ascResult.data[0];
    const createdBeforeDate = oldestProfile.createdAt;
    const filteredBeforeResult =
      await api.functional.redditClone.profiles.index(connection, {
        body: {
          sort: "created_at",
          order: "asc",
          created_before: createdBeforeDate,
          limit: 100,
        } satisfies IRedditCloneUserProfile.IRequest,
      });
    typia.assert(filteredBeforeResult);
    // All returned profiles should have createdAt <= the filter date
    for (const profile of filteredBeforeResult.data) {
      TestValidator.predicate(
        "created_before filter",
        profile.createdAt <= createdBeforeDate,
      );
    }
  }
  // Test 6: Combined date range filtering
  if (descResult.data.length > 1) {
    const newestProfile = descResult.data[0];
    const secondNewestProfile = descResult.data[1];
    const startDate = secondNewestProfile.createdAt;
    const endDate = newestProfile.createdAt;
    const rangeResult = await api.functional.redditClone.profiles.index(
      connection,
      {
        body: {
          sort: "created_at",
          order: "desc",
          created_after: startDate,
          created_before: endDate,
          limit: 100,
        } satisfies IRedditCloneUserProfile.IRequest,
      },
    );
    typia.assert(rangeResult);
    // All returned profiles should be within the date range
    for (const profile of rangeResult.data) {
      TestValidator.predicate(
        "date range filter - created_after",
        profile.createdAt >= startDate,
      );
      TestValidator.predicate(
        "date range filter - created_before",
        profile.createdAt <= endDate,
      );
    }
  }
  // Test 7: Pagination metadata consistency
  TestValidator.predicate(
    "pagination limit is positive",
    descResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination current is valid",
    descResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    descResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    descResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records matches data length or less",
    descResult.pagination.records >= descResult.data.length,
  );
}
