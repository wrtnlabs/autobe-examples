import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog list sorting and pagination capabilities.
 *
 * Validates that the timelog index endpoint correctly sorts results by date and duration, and that pagination returns the correct slices of data with accurate metadata. The test creates 6 timelogs with varying dates and durations to establish a meaningful dataset for sort and pagination verification.
 *
 * Special attention is given to verifying that the default sort order is date descending then created_at descending, custom sort by duration_minutes ascending produces correctly ordered results, pagination with limit=2 returns exactly 2 records per page with correct metadata, consecutive pages have no overlap, and querying a page number beyond the available range returns an empty data array while preserving pagination metadata. Also verifies that all returned timelogs have deleted_at null, confirming soft-deleted records are excluded.
 *
 * 1. Employee authenticates via member join within the organization.
 * 2. Employee creates an active project for time tracking.
 * 3. Employee is assigned as a project member.
 * 4. Employee creates 6 timelogs with descending dates and varying durations.
 * 5. Default sort verification: date descending order.
 * 6. Custom sort verification: duration_minutes ascending order.
 * 7. Pagination page=1 with limit=2: verify 2 records and correct pagination metadata.
 * 8. Pagination page=2: verify next slice of records with no overlap from page 1.
 * 9. Page number exceeding available pages: verify empty data with preserved metadata.
 * 10. Verify soft-deleted timelogs are excluded from all result sets.
 */
export async function test_api_timelog_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(employeeConnection, {});
  typia.assert(authorized);
  // 2. Create active project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  typia.assert(project);
  // 3. Add employee as project member
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      employeeConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 4. Create 6 timelogs with varying dates and durations
  const dates = [
    "2024-01-15",
    "2024-01-14",
    "2024-01-13",
    "2024-01-12",
    "2024-01-11",
    "2024-01-10",
  ];
  const durations = [30, 120, 15, 90, 60, 45];
  for (let i = 0; i < 6; i++) {
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: project.id,
          date: dates[i],
          duration_minutes: durations[i],
        },
      },
    );
    typia.assert(timelog);
  }
  // 5. Test default sort: date DESC, created_at DESC (no sort parameter)
  const defaultResult = await api.functional.erpHrm.member.timelogs.index(
    employeeConnection,
    {
      body: {
        project_id: project.id,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default sort: at least 6 results",
    defaultResult.data.length >= 6,
  );
  for (let i = 1; i < defaultResult.data.length; i++) {
    TestValidator.predicate(
      "default sort: date descending",
      defaultResult.data[i - 1].date >= defaultResult.data[i].date,
    );
  }
  for (const timelog of defaultResult.data) {
    TestValidator.equals(
      "default: no soft-deleted timelogs",
      timelog.deleted_at,
      null,
    );
  }
  // 6. Test custom sort: duration_minutes ASC
  const durationAscSort = ["duration_minutes_asc"] as (string &
    tags.Pattern<"^(date|duration_minutes|created_at)_(asc|desc)$">)[];
  const durationResult = await api.functional.erpHrm.member.timelogs.index(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        sort: durationAscSort,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(durationResult);
  TestValidator.predicate(
    "duration sort: at least 6 results",
    durationResult.data.length >= 6,
  );
  for (let i = 1; i < durationResult.data.length; i++) {
    TestValidator.predicate(
      "duration sort: ascending",
      durationResult.data[i - 1].duration_minutes <=
        durationResult.data[i].duration_minutes,
    );
  }
  // 7. Pagination: page=1, limit=2
  const page1 = await api.functional.erpHrm.member.timelogs.index(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page1: current page",
    page1.pagination.current satisfies number as number,
    1 satisfies number as number,
  );
  TestValidator.equals(
    "page1: limit",
    page1.pagination.limit satisfies number as number,
    2 satisfies number as number,
  );
  TestValidator.equals(
    "page1: records count",
    page1.pagination.records satisfies number as number,
    6 satisfies number as number,
  );
  TestValidator.equals(
    "page1: total pages",
    page1.pagination.pages satisfies number as number,
    3 satisfies number as number,
  );
  TestValidator.equals("page1: data length", page1.data.length, 2);
  // 8. Pagination: page=2, limit=2 — verify no overlap with page 1
  const page2 = await api.functional.erpHrm.member.timelogs.index(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page2: current page",
    page2.pagination.current satisfies number as number,
    2 satisfies number as number,
  );
  TestValidator.equals("page2: data length", page2.data.length, 2);
  const page1Ids = new Set(page1.data.map((t) => t.id));
  for (const timelog of page2.data) {
    TestValidator.predicate(
      "page2: no overlap with page1",
      !page1Ids.has(timelog.id),
    );
  }
  // 9. Page exceeding available pages: 6 records, 2 per page → 3 pages, page=10 out of bounds
  const pageBeyond = await api.functional.erpHrm.member.timelogs.index(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        page: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond: empty data array",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond: records count preserved",
    pageBeyond.pagination.records satisfies number as number,
    6 satisfies number as number,
  );
  TestValidator.equals(
    "page beyond: total pages preserved",
    pageBeyond.pagination.pages satisfies number as number,
    3 satisfies number as number,
  );
}
