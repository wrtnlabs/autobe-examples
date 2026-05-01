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

export async function test_api_timelog_list_self_scoped_with_multi_filter(
  connection: api.IConnection,
): Promise<void> {
  // ---- Actor-specific connection ----
  const memberConnection: api.IConnection = { host: connection.host };
  // ---- 1. Authenticate as a regular employee ----
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // ---- 2. Create an active project ----
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // ---- 3. Get employee ID and assign self as project member ----
  const myEmployeeId: string =
    project.projectMembers.length > 0
      ? project.projectMembers[0].employee.id
      : member.id;
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      body: { erp_hrm_employee_id: myEmployeeId },
      params: { projectId: project.id },
    },
  );
  // ---- 4. Create timelogs across different dates with varied billable flags ----
  const base = new Date();
  const toDate = (d: Date): string => d.toISOString().slice(0, 10);
  const d1 = new Date(base);
  const d2 = new Date(base);
  d2.setDate(d2.getDate() + 1);
  const d3 = new Date(base);
  d3.setDate(d3.getDate() + 2);
  const d4 = new Date(base);
  d4.setDate(d4.getDate() + 3);
  // Days 1-3: billable=true (3 entries — should match filter)
  const tl1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id, date: toDate(d1), billable: true } },
  );
  typia.assert(tl1);
  const tl2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id, date: toDate(d2), billable: true } },
  );
  typia.assert(tl2);
  const tl3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id, date: toDate(d3), billable: true } },
  );
  typia.assert(tl3);
  // Day 1: billable=false (should NOT match when billable=true)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: { project_id: project.id, date: toDate(d1), billable: false },
  });
  // Day 4: billable=true (outside date range — should NOT match)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: { project_id: project.id, date: toDate(d4), billable: true },
  });
  // ---- 5. Query with combined filters: date_range[day1..day3] + project_id + billable=true ----
  const rangeStart = new Date(d1);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(d3);
  rangeEnd.setHours(23, 59, 59, 999);
  const result = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        date_start: rangeStart.toISOString(),
        date_end: rangeEnd.toISOString(),
        project_id: project.id,
        billable: true,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(result);
  // ---- 6. Validate filtered results ----
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    3,
  );
  TestValidator.equals("data length", result.data.length, 3);
  for (const tl of result.data) {
    TestValidator.equals(
      "project id matches filter",
      tl.project.id,
      project.id,
    );
    TestValidator.equals("billable is true", tl.billable, true);
    TestValidator.predicate(
      "date within filtered range",
      tl.date >= toDate(d1) && tl.date <= toDate(d3),
    );
    TestValidator.equals(
      "timelog belongs to authenticated employee",
      tl.employee.id,
      myEmployeeId,
    );
  }
  // ---- 7. Verify employee_id filter is silently ignored (self-scoping enforced) ----
  const unrelatedEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const scopedResult = await api.functional.erpHrm.member.timelogs.index(
    memberConnection,
    {
      body: {
        date_start: rangeStart.toISOString(),
        date_end: rangeEnd.toISOString(),
        project_id: project.id,
        billable: true,
        employee_id: unrelatedEmployeeId,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(scopedResult);
  TestValidator.equals(
    "self-scoping: same count despite foreign employee_id",
    scopedResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "all returned timelogs belong to self",
    scopedResult.data.every((tl) => tl.employee.id === myEmployeeId),
  );
}
