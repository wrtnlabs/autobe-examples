import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity logs filtering by action type and date range.
 *
 * This test verifies that members can filter activity logs using various
 * criteria including action type, target entity type, date range, and search
 * terms. The test validates that filtering returns correct results with
 * proper pagination and sorting.
 */
export async function test_api_activity_logs_filter_by_action_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Test: Filter by action_type and date range
  const filteredByActionType =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          action_type: "timesheet_approved",
          from_date: "2024-01-01T00:00:00Z",
          to_date: "2024-01-31T23:59:59Z",
          page: 1,
          page_size: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredByActionType);
  // Validate all logs have the correct action_type
  for (const log of filteredByActionType.data) {
    TestValidator.equals(
      "action_type matches filter",
      log.action_type,
      "timesheet_approved",
    );
    // Validate created_at is within the date range
    const createdAt = new Date(log.created_at);
    const fromDate = new Date("2024-01-01T00:00:00Z");
    const toDate = new Date("2024-01-31T23:59:59Z");
    TestValidator.predicate(
      "created_at is within date range (from)",
      createdAt >= fromDate,
    );
    TestValidator.predicate(
      "created_at is within date range (to)",
      createdAt <= toDate,
    );
    // Validate actingMember is present (can be null for system-generated logs)
    // No validation needed - just ensure it exists
  }
  // Validate pagination
  TestValidator.predicate(
    "page_size is correct",
    filteredByActionType.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page",
    filteredByActionType.pagination.current,
    1,
  );
  // 3. Test Variation: Filter by target_entity_type
  const filteredByEntityType =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          target_entity_type: "project",
          page: 1,
          page_size: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredByEntityType);
  // Validate all logs have the correct target_entity_type
  for (const log of filteredByEntityType.data) {
    TestValidator.equals(
      "target_entity_type matches filter",
      log.target_entity_type,
      "project",
    );
    // Validate target_entity_id is present (can be null or UUID)
    if (log.target_entity_id !== null && log.target_entity_id !== undefined) {
      TestValidator.predicate(
        "target_entity_id is valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          log.target_entity_id,
        ),
      );
    }
  }
  // 4. Test Variation: Search in action_description
  const searchedLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          search: "approved",
          page: 1,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(searchedLogs);
  // Validate all returned logs contain "approved" in action_description
  for (const log of searchedLogs.data) {
    TestValidator.predicate(
      "action_description contains 'approved' (case-insensitive)",
      log.action_description.toLowerCase().includes("approved"),
    );
  }
  // 5. Test: Verify sorting by created_at descending
  const sortedLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(sortedLogs);
  // Validate results are sorted by created_at descending
  for (let i = 1; i < sortedLogs.data.length; i++) {
    const prevDate = new Date(sortedLogs.data[i - 1].created_at);
    const currDate = new Date(sortedLogs.data[i].created_at);
    TestValidator.predicate(
      `logs are sorted by created_at descending (index ${i})`,
      prevDate >= currDate,
    );
  }
  // 6. Test: Empty filters (should return most recent logs)
  const allLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Validate response structure
  TestValidator.predicate(
    "pagination records count is valid",
    allLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    allLogs.pagination.pages >= 0,
  );
}
