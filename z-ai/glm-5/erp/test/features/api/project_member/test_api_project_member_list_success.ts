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
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test listing project members successfully with pagination.
 *
 * This test verifies that:
 * 1. A member can create a project
 * 2. The project creator is automatically added as a project member
 * 3. The member list endpoint returns paginated results correctly
 * 4. Each member entry contains proper employee details
 */
export async function test_api_project_member_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // Step 2: Create a project using utility function
  // The creator becomes automatically a project member
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(project);
  // Step 3: List project members with pagination
  const response = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(response);
  // Step 4: Verify pagination metadata is properly populated
  TestValidator.predicate(
    "pagination current page should be >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be >= 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1",
    response.pagination.pages >= 1,
  );
  // Step 5: Verify at least one member exists (the creator)
  TestValidator.predicate(
    "data array should have at least one member",
    response.data.length >= 1,
  );
  // Step 6: Verify the member entries have valid roles
  const memberEntry = response.data[0];
  TestValidator.predicate(
    "member role should be either 'member' or 'project_lead'",
    memberEntry.role === "member" || memberEntry.role === "project_lead",
  );
  // Step 7: Verify employee summary has required fields
  TestValidator.predicate(
    "employee should have display name",
    memberEntry.employee.member.displayName.length > 0,
  );
  TestValidator.predicate(
    "employee should have email",
    memberEntry.employee.member.email.length > 0,
  );
  TestValidator.predicate(
    "employee should have employment_type defined",
    memberEntry.employee.employment_type !== undefined,
  );
  TestValidator.predicate(
    "employee should have status defined",
    memberEntry.employee.status !== undefined,
  );
}
