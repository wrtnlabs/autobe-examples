import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoViewStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering capabilities of view statistics.
 * Authenticate as a member, then call the view-stats endpoint with specific filters:
 * view_type='list' (or 'detail'), start_date and end_date parameters to define a date range.
 * Verify the response only includes records matching the specified view_type.
 * Check that all returned records have created_at timestamps within the specified date range (inclusive).
 * Test both view_type values separately. Ensure pagination still works correctly with filtered results.
 * Validate that the filtering logic correctly isolates to the authenticated member's data only.
 */
export async function test_api_view_stats_filtered_by_type_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Generate test date range
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  // Convert to ISO strings for API request
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  // 2. Test with view_type='list' filter
  const listResponse: IPageIMultiUserTodoTodoViewStat.ISummary =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          view_type: "list",
          start_date: startDateISO,
          end_date: endDateISO,
          page: 1,
          limit: 20,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(listResponse);
  // Validate all records have view_type='list'
  for (const record of listResponse.data) {
    TestValidator.equals(
      "record should have view_type 'list'",
      record.view_type,
      "list",
    );
  }
  // Validate all records are within date range
  for (const record of listResponse.data) {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      "created_at should be >= start_date",
      createdAt >= startDate,
    );
    TestValidator.predicate(
      "created_at should be <= end_date",
      createdAt <= endDate,
    );
  }
  // Validate pagination
  TestValidator.equals(
    "page should be 1",
    listResponse.pagination.current,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "limit should be 20",
    listResponse.pagination.limit,
    20 satisfies number as number,
  );
  // 3. Test with view_type='detail' filter
  const detailResponse: IPageIMultiUserTodoTodoViewStat.ISummary =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          view_type: "detail",
          start_date: startDateISO,
          end_date: endDateISO,
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(detailResponse);
  // Validate all records have view_type='detail'
  for (const record of detailResponse.data) {
    TestValidator.equals(
      "record should have view_type 'detail'",
      record.view_type,
      "detail",
    );
  }
  // Validate all records are within date range
  for (const record of detailResponse.data) {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      "created_at should be >= start_date",
      createdAt >= startDate,
    );
    TestValidator.predicate(
      "created_at should be <= end_date",
      createdAt <= endDate,
    );
  }
  // 4. Test pagination with filters
  const page2Response: IPageIMultiUserTodoTodoViewStat.ISummary =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          view_type: "list",
          start_date: startDateISO,
          end_date: endDateISO,
          page: 2,
          limit: 5,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page should be 2",
    page2Response.pagination.current,
    2 satisfies number as number,
  );
  TestValidator.equals(
    "limit should be 5",
    page2Response.pagination.limit,
    5 satisfies number as number,
  );
  // 5. Test without view_type (only date range)
  const dateOnlyResponse: IPageIMultiUserTodoTodoViewStat.ISummary =
    await api.functional.multiUserTodo.member.view_stats.index(
      memberConnection,
      {
        body: {
          start_date: startDateISO,
          end_date: endDateISO,
          page: 1,
          limit: 15,
        } satisfies IMultiUserTodoTodoViewStat.IRequest,
      },
    );
  typia.assert(dateOnlyResponse);
  // Validate all records are within date range
  for (const record of dateOnlyResponse.data) {
    const createdAt = new Date(record.created_at);
    TestValidator.predicate(
      "created_at should be >= start_date",
      createdAt >= startDate,
    );
    TestValidator.predicate(
      "created_at should be <= end_date",
      createdAt <= endDate,
    );
  }
  // All validation passed
}
