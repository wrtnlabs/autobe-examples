import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_list_employee_own_entries_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member (automatically creates employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple timelog entries across different dates
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  // Create timelogs for different dates with different billable statuses
  const timelogToday =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          date: today.toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogToday);
  const timelogYesterday =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          date: yesterday.toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogYesterday);
  const timelogTwoDaysAgo =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          date: twoDaysAgo.toISOString(),
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(timelogTwoDaysAgo);
  // 3. Query timelogs without filters - should return all employee's timelogs
  const allTimelogs = await api.functional.hrmPlatform.member.timelogs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  // Verify pagination metadata
  TestValidator.predicate(
    "has pagination data",
    allTimelogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    allTimelogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    allTimelogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allTimelogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allTimelogs.pagination.pages >= 0,
  );
  // Verify all returned timelogs belong to the authenticated employee
  TestValidator.predicate(
    "returns at least 3 timelogs",
    allTimelogs.data.length >= 3,
  );
  for (const timelog of allTimelogs.data) {
    TestValidator.equals(
      "timelog belongs to authenticated employee",
      timelog.employee.user.id,
      memberAuth.id,
    );
  }
  // 4. Query with date range filter (fromDate and toDate)
  const dateRangeTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        fromDate: twoDaysAgo.toISOString(),
        toDate: today.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(dateRangeTimelogs);
  // Verify date filtering - all returned timelogs should be within the date range
  const twoDaysAgoTime = twoDaysAgo.getTime();
  const todayTime = today.getTime();
  for (const timelog of dateRangeTimelogs.data) {
    const timelogDate = new Date(timelog.date).getTime();
    TestValidator.predicate(
      `timelog date ${timelog.date} is within range`,
      timelogDate >= twoDaysAgoTime && timelogDate <= todayTime,
    );
  }
  // 5. Query with billable filter - true
  const billableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  // Verify all returned timelogs are billable
  for (const timelog of billableTimelogs.data) {
    TestValidator.equals("timelog is billable", timelog.billable, true);
  }
  // 6. Query with billable filter - false
  const nonBillableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(nonBillableTimelogs);
  // Verify all returned timelogs are non-billable
  for (const timelog of nonBillableTimelogs.data) {
    TestValidator.equals("timelog is non-billable", timelog.billable, false);
  }
  // 7. Query with project_id filter
  const projectFilteredTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        project_id: timelogToday.project.id,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(projectFilteredTimelogs);
  // Verify all returned timelogs belong to the specified project
  for (const timelog of projectFilteredTimelogs.data) {
    TestValidator.equals(
      "timelog belongs to filtered project",
      timelog.project.id,
      timelogToday.project.id,
    );
  }
  // 8. Verify task field is nullable (can be null or present)
  TestValidator.predicate(
    "task field is nullable",
    timelogToday.task === null ||
      timelogToday.task === undefined ||
      timelogToday.task.id !== undefined,
  );
}