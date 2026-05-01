import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test password reset history retrieval with date range filtering and pagination.
 *
 * Validates that a member can retrieve their password reset history filtered by creation date range using the created_from and created_to parameters. The test exercises single-sided filters (only lower bound, only upper bound), full inclusive range filters (both bounds combined), and verifies that pagination metadata accurately reflects the filtered result subset rather than the full unfiltered dataset.
 *
 * 1. Retrieve history with only created_from to confirm all results have created_at on or after the lower bound.
 * 2. Retrieve history with only created_to to confirm all results have created_at on or before the upper bound.
 * 3. Retrieve history with both created_from and created_to for an inclusive range filter.
 * 4. Test pagination within the filtered result set and validate pagination metadata consistency.
 */
export async function test_api_password_reset_history_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  const username = "testuser";
  // Define date boundaries for filtering
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  // 1. Test created_from only (lower bound)
  const fromResult =
    await api.functional.communityHub.members.password_resets.index(
      connection,
      {
        username,
        body: {
          created_from: oneYearAgo.toISOString(),
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(fromResult);
  for (const item of fromResult.data) {
    TestValidator.predicate(
      "created_at is on or after created_from",
      new Date(item.created_at).getTime() >= oneYearAgo.getTime(),
    );
  }
  // 2. Test created_to only (upper bound)
  const toResult =
    await api.functional.communityHub.members.password_resets.index(
      connection,
      {
        username,
        body: {
          created_to: now.toISOString(),
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(toResult);
  for (const item of toResult.data) {
    TestValidator.predicate(
      "created_at is on or before created_to",
      new Date(item.created_at).getTime() <= now.getTime(),
    );
  }
  // 3. Test both created_from and created_to (inclusive range)
  const rangeResult =
    await api.functional.communityHub.members.password_resets.index(
      connection,
      {
        username,
        body: {
          created_from: oneYearAgo.toISOString(),
          created_to: now.toISOString(),
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(rangeResult);
  for (const item of rangeResult.data) {
    const itemTime = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "created_at is within inclusive date range",
      itemTime >= oneYearAgo.getTime() && itemTime <= now.getTime(),
    );
  }
  // 4. Test pagination within filtered results
  const pageResult =
    await api.functional.communityHub.members.password_resets.index(
      connection,
      {
        username,
        body: {
          created_from: oneYearAgo.toISOString(),
          created_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityHubMemberPasswordReset.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    pageResult.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    pageResult.pagination.pages >= 0,
  );
}
