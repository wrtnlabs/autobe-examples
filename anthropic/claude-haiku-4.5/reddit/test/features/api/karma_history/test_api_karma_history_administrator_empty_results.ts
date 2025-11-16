import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaHistory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaHistory";

/**
 * Test empty result set handling in karma history queries for administrators.
 *
 * Validates that the karma history endpoint correctly handles queries with
 * filters that return no matching records. Tests various filtering scenarios:
 *
 * - Searching by non-existent member ID
 * - Filtering by change reasons with no matching records
 * - Date ranges with no karma history activity
 *
 * Verifies that empty result sets return proper pagination metadata with
 * records: 0, pages: 0, and an empty data array, ensuring consistent response
 * structure regardless of result count.
 *
 * Steps:
 *
 * 1. Create administrator account
 * 2. Query karma history with non-existent member ID filter
 * 3. Validate empty result set with proper pagination
 * 4. Query karma history with change reason filter matching no records
 * 5. Validate empty result set structure
 * 6. Query karma history with date range having no activity
 * 7. Validate empty result set with pagination metadata
 */
export async function test_api_karma_history_administrator_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Query karma history with non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyByMemberId: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: nonExistentMemberId,
          change_reason: null,
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyByMemberId);
  TestValidator.equals(
    "empty result by member ID - data array",
    emptyByMemberId.data,
    [],
  );
  TestValidator.equals(
    "empty result by member ID - records count",
    emptyByMemberId.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result by member ID - pages count",
    emptyByMemberId.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result by member ID - current page",
    emptyByMemberId.pagination.current,
    1,
  );

  // Step 3: Query karma history with change reason filter matching no records
  const changeReasons: readonly (
    | "vote_created"
    | "vote_removed"
    | "vote_changed"
    | "vote_reversed"
    | "content_removed"
    | "user_suspended"
    | "user_banned"
    | "correction"
  )[] = [
    "vote_created",
    "vote_removed",
    "vote_changed",
    "vote_reversed",
    "content_removed",
    "user_suspended",
    "user_banned",
    "correction",
  ] as const;
  const selectedReason = RandomGenerator.pick(changeReasons);

  const emptyByChangeReason: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null,
          change_reason: selectedReason,
          created_at_start: null,
          created_at_end: null,
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyByChangeReason);
  TestValidator.equals(
    "empty result by change reason - data array",
    emptyByChangeReason.data,
    [],
  );
  TestValidator.equals(
    "empty result by change reason - records count",
    emptyByChangeReason.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result by change reason - pages count",
    emptyByChangeReason.pagination.pages,
    0,
  );

  // Step 4: Query karma history with date range having no activity
  const pastStartDate = new Date("2020-01-01").toISOString();
  const pastEndDate = new Date("2020-01-31").toISOString();

  const emptyByDateRange: IPageICommunityPlatformKarmaHistory =
    await api.functional.communityPlatform.administrator.karmaHistory.index(
      connection,
      {
        body: {
          member_id: null,
          change_reason: null,
          created_at_start: pastStartDate satisfies string &
            tags.Format<"date-time">,
          created_at_end: pastEndDate satisfies string &
            tags.Format<"date-time">,
          sort_by: "created_at_desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformKarmaHistory.IRequest,
      },
    );
  typia.assert(emptyByDateRange);
  TestValidator.equals(
    "empty result by date range - data array",
    emptyByDateRange.data,
    [],
  );
  TestValidator.equals(
    "empty result by date range - records count",
    emptyByDateRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result by date range - pages count",
    emptyByDateRange.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result by date range - pagination limit",
    emptyByDateRange.pagination.limit,
    10,
  );
}
