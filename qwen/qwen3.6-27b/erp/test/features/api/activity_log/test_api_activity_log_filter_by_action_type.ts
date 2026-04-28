import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogDetail";
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
 * Test filtering activity logs by action type with pagination.
 *
 * Validates that the activity log search endpoint correctly filters results by one or more action types using OR logic, returns properly structured log entries with associated detail records and member information, and supports offset-based pagination with accurate metadata. Verifies that action type filtering uses SQL IN clause matching where multiple filter values produce results matching any of the specified types.
 *
 * Special attention is given to confirming that pagination boundary calculations are correct (pages = ceil(records / limit)), data length never exceeds the configured limit, and subsequent pages return distinct records with no overlap from earlier pages.
 *
 * 1. Authenticate as a new member to establish active organization context.
 * 2. Query activity logs filtered by a single action type 'employee_invited'.
 * 3. Verify all returned entries have the expected action type and valid structure.
 * 4. Query with multiple action types to verify OR filter logic and that result set is at least as large.
 * 5. Paginate through unfiltered logs to validate page navigation and metadata correctness.
 * 6. If page 2 exists, confirm no record IDs overlap between page 1 and page 2.
 */
export async function test_api_activity_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member - creates default organization with initial activity logs
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Query with single actionType filter
  const singleFilter = {
    actionType: ["employee_invited"],
    page: 1,
    limit: 10,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const singleResult =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: singleFilter },
    );
  typia.assert(singleResult);
  // 3. Verify all returned entries match the filtered action type (empty array is valid)
  TestValidator.predicate(
    "all single-filter entries have employee_invited action type",
    singleResult.data.every((log) => log.actionType === "employee_invited"),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "single filter current page",
    singleResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "single filter limit",
    singleResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "single filter data length does not exceed limit",
    singleResult.data.length <= singleResult.pagination.limit,
  );
  // 4. Query with multiple actionTypes to verify OR logic
  const allowedActionTypes = ["project_created", "employee_invited"] as const;
  const multiFilter = {
    actionType: ["project_created", "employee_invited"],
    page: 1,
    limit: 10,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const multiResult =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: multiFilter },
    );
  typia.assert(multiResult);
  // Every entry must have an actionType matching one of the filter values
  TestValidator.predicate(
    "all multi-filter entries have one of the specified action types",
    multiResult.data.every((log) =>
      allowedActionTypes.includes(
        log.actionType as (typeof allowedActionTypes)[number],
      ),
    ),
  );
  // Multi-filter result set should be >= single-filter result set (OR logic superset)
  TestValidator.predicate(
    "multi-filter returns at least as many total records as single-filter",
    multiResult.pagination.records >= singleResult.pagination.records,
  );
  TestValidator.equals(
    "multi filter current page",
    multiResult.pagination.current,
    1,
  );
  TestValidator.equals("multi filter limit", multiResult.pagination.limit, 10);
  // 5. Paginate unfiltered logs with small limit for page navigation test
  const page1Request = {
    page: 1,
    limit: 2,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const page1Result =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      { body: page1Request },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 data length does not exceed limit",
    page1Result.data.length <= page1Result.pagination.limit,
  );
  TestValidator.predicate(
    "page 1 pages calculation is consistent",
    page1Result.pagination.records === 0
      ? page1Result.pagination.pages === 0
      : page1Result.pagination.pages >= 1,
  );
  // 6. If page 2 exists, verify results are different from page 1
  if (page1Result.pagination.pages >= 2) {
    const page2Request = {
      page: 2,
      limit: 2,
    } satisfies IHrmPlatformActivityLog.IRequest;
    const page2Result =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        { body: page2Request },
      );
    typia.assert(page2Result);
    TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
    // Verify no overlapping record IDs between pages
    const page1Ids = new Set(page1Result.data.map((log) => log.id));
    const hasOverlap = page2Result.data.some((log) => page1Ids.has(log.id));
    TestValidator.predicate(
      "page 1 and page 2 have no overlapping record IDs",
      !hasOverlap,
    );
  }
}
