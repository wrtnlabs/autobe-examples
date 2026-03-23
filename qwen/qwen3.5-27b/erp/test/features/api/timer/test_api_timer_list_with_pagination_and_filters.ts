import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the timer list endpoint with comprehensive filtering and pagination capabilities.
 *
 * This test validates:
 * 1. Default pagination returns timers with correct metadata
 * 2. Pagination parameters (page, limit) work correctly
 * 3. Status filter (active/stopped) returns correct timer states
 * 4. Date range filter (start_date, end_date) returns timers within range
 * 5. Project ID filter returns timers for specific project
 * 6. Task ID filter returns timers for specific task
 * 7. Search parameter filters by description text
 * 8. Sort and order parameters control result ordering
 * 9. Data isolation ensures only authenticated employee's timers are returned
 */
export async function test_api_timer_list_with_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Test default pagination (no filters)
  const defaultResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination has correct structure",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default result has valid data array",
    Array.isArray(defaultResult.data),
  );
  // 3. Test custom pagination parameters
  const paginatedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "custom page number is applied",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is applied",
    paginatedResult.pagination.limit,
    10,
  );
  // 4. Test status filter - active timers
  const activeResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active filter returns only running timers",
    activeResult.data.every((timer) => timer.stopped_at === null),
  );
  // 5. Test status filter - stopped timers
  const stoppedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "stopped",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(stoppedResult);
  TestValidator.predicate(
    "stopped filter returns only completed timers",
    stoppedResult.data.every((timer) => timer.stopped_at !== null),
  );
  // 6. Test date range filter
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // 7 days ago
  const endDate = new Date();
  const dateRangeResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns timers within range",
    dateRangeResult.data.every(
      (timer) =>
        new Date(timer.started_at) >= startDate &&
        new Date(timer.started_at) <= endDate,
    ),
  );
  // 7. Test project ID filter
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const projectResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        project_id: projectId,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(projectResult);
  TestValidator.predicate(
    "project filter returns only timers for specified project",
    projectResult.data.every((timer) => timer.project.id === projectId),
  );
  // 8. Test task ID filter
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const taskResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        task_id: taskId,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(taskResult);
  TestValidator.predicate(
    "task filter returns only timers for specified task",
    taskResult.data.every((timer) => timer.task?.id === taskId),
  );
  // 9. Test search parameter
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search filter returns timers with matching description",
    searchResult.data.every(
      (timer) =>
        timer.description === null ||
        timer.description.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // 10. Test sort by started_at ascending
  const sortAscResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sort: "started_at",
        order: "asc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortAscResult);
  TestValidator.predicate(
    "sort by started_at ascending returns correct order",
    sortAscResult.data.every((timer, index, array) => {
      if (index === 0) return true;
      return (
        new Date(timer.started_at) >= new Date(array[index - 1].started_at)
      );
    }),
  );
  // 11. Test sort by created_at descending (default)
  const sortDescResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(sortDescResult);
  TestValidator.predicate(
    "sort by created_at descending returns correct order",
    sortDescResult.data.every((timer, index, array) => {
      if (index === 0) return true;
      return (
        new Date(timer.created_at) <= new Date(array[index - 1].created_at)
      );
    }),
  );
  // 12. Test combined filters (status + date range)
  const combinedResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "stopped",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 5,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter respects limit",
    combinedResult.data.length,
    Math.min(5, combinedResult.pagination.records),
  );
  TestValidator.predicate(
    "combined filter returns only stopped timers",
    combinedResult.data.every((timer) => timer.stopped_at !== null),
  );
  TestValidator.predicate(
    "combined filter returns timers within date range",
    combinedResult.data.every(
      (timer) =>
        new Date(timer.started_at) >= startDate &&
        new Date(timer.started_at) <= endDate,
    ),
  );
  // 13. Test empty result set
  const emptyResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        status: "active",
        search: "nonexistent" + RandomGenerator.alphabets(10),
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  // 14. Verify data isolation - all timers belong to authenticated employee
  const isolationResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(isolationResult);
  TestValidator.predicate(
    "data isolation ensures all timers belong to authenticated employee",
    isolationResult.data.every(
      (timer) => timer.employee.member.id === memberAuth.id,
    ),
  );
}
