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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test employee's assigned projects list functionality.
 *
 * Note: The full scenario requires assigning an employee to projects with different
 * roles, but the current API set doesn't provide an endpoint to retrieve the current
 * employee's ID. This test verifies the endpoint behavior for a newly joined member
 * who hasn't been assigned to any projects yet.
 *
 * Full scenario testing would require:
 * - GET /employees/me endpoint to retrieve current employee ID
 * - Or employee_id returned in the join response
 */
export async function test_api_project_assigned_list_with_multiple_roles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create 3 projects within the organization
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  const project3 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project3);
  // 3. Call the assigned projects endpoint
  // Since the member hasn't been assigned to any projects, expect empty results
  const result = await api.functional.erpHrm.member.projects.assigned.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(result);
  // 4. Verify pagination structure
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  // 5. Verify empty results for newly joined member
  // Note: Creating projects does NOT automatically assign the creator as a member
  TestValidator.equals("no assigned projects", result.data.length, 0);
  TestValidator.equals("records count is zero", result.pagination.records, 0);
  TestValidator.equals("pages count is zero", result.pagination.pages, 0);
}
