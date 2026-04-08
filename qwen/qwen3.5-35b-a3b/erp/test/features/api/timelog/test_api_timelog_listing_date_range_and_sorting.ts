import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_listing_date_range_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([
        1, 4, 7, 10,
      ]) as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create project
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: RandomGenerator.pick([
          "#FF5733",
          "#33FF57",
          "#3357FF",
          "#F3FF33",
          "#FF33F3",
        ]),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >() as number satisfies number,
      },
    },
  );
  typia.assert(project);
  // Helper function to create timelogs
  const today = new Date();
  const createTimelog = async (
    offsetDays: number,
    billable: boolean,
  ): Promise<IHrmPlatformTimelog> => {
    const startDateTime = new Date(
      today.getTime() - offsetDays * 24 * 60 * 60 * 1000 - offsetDays * 10000,
    );
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const result = await api.functional.hrmPlatform.member.timelogs.create(
      memberConnection,
      {
        body: {
          employee_id: memberAuth.member.id,
          project_id: project.id,
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<120>
          >() satisfies number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable,
        },
      },
    );
    typia.assert(result);
    return result;
  };
  // Create multiple timelogs with varied properties
  const employeeId = memberAuth.member.id;
  const timelogData = [
    { offsetDays: 0, billable: true },
    { offsetDays: 1, billable: false },
    { offsetDays: 2, billable: true },
    { offsetDays: 3, billable: false },
    { offsetDays: 4, billable: true },
    { offsetDays: 5, billable: false },
    { offsetDays: 6, billable: true },
  ];
  const timelogs: IHrmPlatformTimelog[] = [];
  for (const data of timelogData) {
    const timelog = await createTimelog(data.offsetDays, data.billable);
    timelogs.push(timelog);
  }
  typia.assert(timelogs);
  // Sort timelogs by created_at for consistent ordering
  timelogs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  // 2. Date range filtering test
  const startDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const endDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const endOfDay = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  endOfDay.setHours(23, 59, 59, 999);
  const dateRangeTimelogs = timelogs.filter((t) => {
    const start = new Date(t.start_datetime);
    return start >= startOfDay && start <= endOfDay;
  });
  const dateRangeFilterResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      },
    });
  typia.assert(dateRangeFilterResult);
  TestValidator.equals(
    "date range filtered count",
    dateRangeFilterResult.data.length,
    dateRangeTimelogs.length,
  );
  // Validate each returned timelog is within date range
  for (const timelog of dateRangeFilterResult.data) {
    typia.assert(timelog);
    const start = new Date(timelog.start_datetime);
    TestValidator.predicate(
      `timelog ${timelog.id} start is within range`,
      start >= startOfDay && start <= endOfDay,
    );
  }
  // 3. Billable status filtering test
  const billableTrueResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
      },
    });
  typia.assert(billableTrueResult);
  const billableFalseResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
      },
    });
  typia.assert(billableFalseResult);
  const expectedBillableTrueCount = timelogs.filter(
    (t) => t.billable === true,
  ).length;
  const expectedBillableFalseCount = timelogs.filter(
    (t) => t.billable === false,
  ).length;
  TestValidator.equals(
    "billable=true count",
    billableTrueResult.data.length,
    expectedBillableTrueCount,
  );
  TestValidator.equals(
    "billable=false count",
    billableFalseResult.data.length,
    expectedBillableFalseCount,
  );
  // Verify all returned timelogs have correct billable status
  for (const timelog of billableTrueResult.data) {
    typia.assert(timelog);
    TestValidator.predicate("timelog is billable", timelog.billable === true);
  }
  for (const timelog of billableFalseResult.data) {
    typia.assert(timelog);
    TestValidator.predicate(
      "timelog is non-billable",
      timelog.billable === false,
    );
  }
  // 4. Sorting tests
  // Sort by start_datetime ascending
  const sortByStartDateTimeAsc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "start_datetime",
        sort_order: "asc",
      },
    });
  typia.assert(sortByStartDateTimeAsc);
  // Validate ascending order
  for (let i = 1; i < sortByStartDateTimeAsc.data.length; i++) {
    const prev = sortByStartDateTimeAsc.data[i - 1].start_datetime;
    const curr = sortByStartDateTimeAsc.data[i].start_datetime;
    TestValidator.predicate(
      `start_datetime asc order at index ${i}`,
      prev <= curr,
    );
  }
  // Sort by start_datetime descending
  const sortByStartDateTimeDesc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "start_datetime",
        sort_order: "desc",
      },
    });
  typia.assert(sortByStartDateTimeDesc);
  // Validate descending order
  for (let i = 1; i < sortByStartDateTimeDesc.data.length; i++) {
    const prev = sortByStartDateTimeDesc.data[i - 1].start_datetime;
    const curr = sortByStartDateTimeDesc.data[i].start_datetime;
    TestValidator.predicate(
      `start_datetime desc order at index ${i}`,
      prev >= curr,
    );
  }
  // Sort by duration_minutes ascending
  const sortByDurationAsc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "duration_minutes",
        sort_order: "asc",
      },
    });
  typia.assert(sortByDurationAsc);
  // Validate ascending order
  for (let i = 1; i < sortByDurationAsc.data.length; i++) {
    const prev = sortByDurationAsc.data[i - 1].duration_minutes;
    const curr = sortByDurationAsc.data[i].duration_minutes;
    TestValidator.predicate(
      `duration_minutes asc order at index ${i}`,
      prev <= curr,
    );
  }
  // Sort by duration_minutes descending
  const sortByDurationDesc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "duration_minutes",
        sort_order: "desc",
      },
    });
  typia.assert(sortByDurationDesc);
  // Validate descending order
  for (let i = 1; i < sortByDurationDesc.data.length; i++) {
    const prev = sortByDurationDesc.data[i - 1].duration_minutes;
    const curr = sortByDurationDesc.data[i].duration_minutes;
    TestValidator.predicate(
      `duration_minutes desc order at index ${i}`,
      prev >= curr,
    );
  }
  // Sort by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      },
    });
  typia.assert(sortByCreatedAtAsc);
  // Cast to IHrmPlatformTimelog[] to fix type issues with created_at property
  const sortByCreatedAtAscTimelogs =
    sortByCreatedAtAsc.data as unknown as IHrmPlatformTimelog[];
  // Validate ascending order
  for (let i = 1; i < sortByCreatedAtAscTimelogs.length; i++) {
    const prev = sortByCreatedAtAscTimelogs[i - 1].created_at;
    const curr = sortByCreatedAtAscTimelogs[i].created_at;
    TestValidator.predicate(`created_at asc order at index ${i}`, prev <= curr);
  }
  // Sort by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      },
    });
  typia.assert(sortByCreatedAtDesc);
  const sortByCreatedAtDescTimelogs =
    sortByCreatedAtDesc.data as unknown as IHrmPlatformTimelog[];
  // Validate descending order
  for (let i = 1; i < sortByCreatedAtDescTimelogs.length; i++) {
    const prev = sortByCreatedAtDescTimelogs[i - 1].created_at;
    const curr = sortByCreatedAtDescTimelogs[i].created_at;
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      prev >= curr,
    );
  }
  // 5. Pagination tests
  const limit = 5;
  const paginatedResult =
    await api.functional.hrmPlatform.member.timelogs.index(memberConnection, {
      body: {
        limit: limit,
        page: 1,
      },
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "page size matches limit",
    paginatedResult.data.length,
    Math.min(limit, timelogs.length),
  );
  TestValidator.equals(
    "total records count",
    paginatedResult.pagination.records,
    timelogs.length,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  // Test cursor-based pagination if there are more pages
  if (paginatedResult.data.length > 0 && paginatedResult.pagination.pages > 1) {
    const nextCursor =
      paginatedResult.pagination.current < paginatedResult.pagination.pages
        ? timelogs[paginatedResult.data.length - 1].id
        : undefined;
    if (nextCursor) {
      const nextPage = await api.functional.hrmPlatform.member.timelogs.index(
        memberConnection,
        {
          body: {
            cursor: nextCursor,
            limit: limit,
            page: 2,
          },
        },
      );
      typia.assert(nextPage);
      TestValidator.equals(
        "second page has correct current",
        nextPage.pagination.current,
        2,
      );
    }
  }
}