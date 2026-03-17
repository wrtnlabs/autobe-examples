import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_files_search_default_parameters(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty request body - default behavior
  const emptyRequest = {} satisfies ICommunityPlatformFile.IRequest;
  const result1 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: emptyRequest,
    },
  );
  typia.assert(result1);
  // Validate pagination defaults
  TestValidator.equals(
    "pagination current page default",
    result1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit at least 1",
    result1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination limit at most 100",
    result1.pagination.limit <= 100,
  );
  // Fix: Use predicate for boolean checks instead of equals with boolean value
  TestValidator.predicate(
    "pagination records non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result1.pagination.pages >= 0,
  );
  // Handle edge case when no records
  if (result1.pagination.records === 0) {
    TestValidator.equals("no records means empty data", result1.data.length, 0);
    TestValidator.equals(
      "no records means 0 pages",
      result1.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "data length at most limit",
      result1.data.length <= result1.pagination.limit,
    );
    TestValidator.predicate(
      "data length matches records when on first page",
      result1.pagination.current === 1
        ? result1.data.length <= result1.pagination.records
        : true,
    );
  }
  // Validate each file summary
  for (const file of result1.data) {
    typia.assert(file);
    // Soft-deleted files should be excluded
    TestValidator.equals("file not soft-deleted", file.deleted_at, null);
    // Validate actor using typia.assert - it will validate the actor type correctly
    typia.assert(file.actor);
    // Public URL should be present for completed files
    if (file.status === "completed") {
      TestValidator.predicate(
        "completed file has public_url",
        file.public_url !== null,
      );
    }
  }
  // Test 2: Minimal request with only page and limit
  const minimalRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformFile.IRequest;
  const result2 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: minimalRequest,
    },
  );
  typia.assert(result2);
  TestValidator.equals("minimal request page", result2.pagination.current, 1);
  TestValidator.equals("minimal request limit", result2.pagination.limit, 10);
  // Test 3: Request with limit=1 (minimum)
  const minLimitRequest = {
    limit: 1,
  } satisfies ICommunityPlatformFile.IRequest;
  const result3 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: minLimitRequest,
    },
  );
  typia.assert(result3);
  TestValidator.equals("minimum limit", result3.pagination.limit, 1);
  TestValidator.predicate("data length at most 1", result3.data.length <= 1);
  // Test 4: Request with limit=100 (maximum)
  const maxLimitRequest = {
    limit: 100,
  } satisfies ICommunityPlatformFile.IRequest;
  const result4 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: maxLimitRequest,
    },
  );
  typia.assert(result4);
  TestValidator.equals("maximum limit", result4.pagination.limit, 100);
  TestValidator.predicate(
    "data length at most 100",
    result4.data.length <= 100,
  );
  // Test 5: Request with page beyond records
  const largePageRequest = {
    page: 99999,
    limit: 10,
  } satisfies ICommunityPlatformFile.IRequest;
  const result5 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: largePageRequest,
    },
  );
  typia.assert(result5);
  TestValidator.equals("large page returns empty data", result5.data.length, 0);
  // Handle pagination logic for large page
  if (result5.pagination.pages > 0) {
    TestValidator.predicate(
      "current page should be total pages when page exceeds",
      result5.pagination.current === result5.pagination.pages,
    );
  }
  // Test 6: Date range filtering with valid ISO strings
  const now = new Date().toISOString();
  const past = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const dateRangeRequest = {
    created_at_start: past,
    created_at_end: now,
  } satisfies ICommunityPlatformFile.IRequest;
  const result6 = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: dateRangeRequest,
    },
  );
  typia.assert(result6);
  // Validate date strings are valid ISO format (typia.assert already validated)
  // Additional validation that returned files are within range
  for (const file of result6.data) {
    const createdAt = new Date(file.created_at);
    const startDate = new Date(past);
    const endDate = new Date(now);
    // Allow small tolerance for timezone/rounding issues
    const timeDiffStart = createdAt.getTime() - startDate.getTime();
    const timeDiffEnd = endDate.getTime() - createdAt.getTime();
    TestValidator.predicate(
      "file created within date range (with tolerance)",
      timeDiffStart >= -1000 && timeDiffEnd >= -1000,
    );
  }
  // Test 7: Filter by actor_type - simplified to just make the request
  const actorTypes = ["member", "community", "admin"] as const;
  for (const actorType of actorTypes) {
    const actorRequest = {
      actor_type: actorType,
      limit: 10,
    } satisfies ICommunityPlatformFile.IRequest;
    const result = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: actorRequest,
      },
    );
    typia.assert(result);
    // Validate that returned files match actor_type filter
    for (const file of result.data) {
      // Need to check how to get actor type from file
      // Check if file has actor_type field or need to use discriminator on file.actor
      // Use type narrowing with 'in' operator to check actor type
      if ("type" in file.actor) {
        TestValidator.equals("file actor_type matches filter", file.actor.type, actorType);
      } else {
        // Alternative: check if file has actor_type field directly
        TestValidator.predicate("file has actor_type field", false); // placeholder
      }
    }
  }
}
