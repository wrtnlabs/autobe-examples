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
 * Test that the organization owner with view-all-time permission can browse timelogs
 * with the employee_id filter honored and applied correctly.
 *
 * Validates the timelog listing endpoint behavior when an owner with the view-all-time
 * permission applies the employee_id filter. Unlike regular employees whose employee_id
 * filter is silently ignored (results auto-scoped to self), the owner's filter must be
 * actively honored and restrict results to only the specified employee's timelogs.
 *
 * The test verifies four key behaviors:
 * 1. The employee_id filter is honored — all returned timelogs belong exclusively to the
 *    employee specified in the filter.
 * 2. Pagination metadata accurately reflects the filtered subset rather than the total
 *    organization-wide count.
 * 3. Each timelog entry carries a complete employee summary context via the nested
 *    IErpHrmEmployee.ISummary structure (validated by typia.assert).
 * 4. The Owner role with view-all-time permission receives results without automatic
 *    self-scoping.
 *
 * 1. Owner registers and authenticates via join, receiving the Owner role with all
 *    permissions including view-all-time.
 * 2. Owner creates an active project to serve as the time-tracking target.
 * 3. Owner creates three timelogs against the project, extracting the owner's
 *    employee_id from the first timelog response.
 * 4. Owner queries the timelog index with employee_id filter set to their own
 *    employee ID, verifying the filter is actively applied.
 */
export async function test_api_timelog_list_manager_view_all_with_employee_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates via join (first member receives Owner role with all permissions)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create an active project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelogs and extract the owner's employee_id from the first response
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    { body: { project_id: project.id } },
  );
  typia.assert(timelog1);
  const ownerEmployeeId = timelog1.employee.id;
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    { body: { project_id: project.id } },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    { body: { project_id: project.id, billable: false } },
  );
  typia.assert(timelog3);
  // 4. Query timelogs with employee_id filter — must be honored for view-all-time users
  const filteredPage = await api.functional.erpHrm.member.timelogs.index(
    ownerConnection,
    {
      body: {
        employee_id: ownerEmployeeId,
        limit: 100,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(filteredPage);
  // 5. Validate: all returned timelogs belong exclusively to the filtered employee
  TestValidator.predicate(
    "all returned timelogs belong to the filtered employee",
    filteredPage.data.every((t) => t.employee.id === ownerEmployeeId),
  );
  // 6. Validate: pagination metadata reflects the filtered subset
  TestValidator.equals(
    "pagination records count matches returned data length",
    filteredPage.pagination.records,
    filteredPage.data.length,
  );
  // 7. Validate: at least the three timelogs we created are present
  TestValidator.predicate(
    "at least 3 timelogs returned in filtered results",
    filteredPage.data.length >= 3,
  );
}
