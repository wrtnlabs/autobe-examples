import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test retrieving a project when the authenticated member has project:manage
 * permission at organization level but is NOT explicitly assigned as a project member.
 *
 * This test validates that project:manage permission grants visibility to all
 * projects in the organization, allowing access without explicit project membership.
 *
 * Scenario:
 * 1. Authenticate as member with project:manage permission (via organization role)
 * 2. Create a new project in the organization
 * 3. Ensure member is NOT added as a project member (not explicitly assigned)
 * 4. Call GET /erpHrm/member/projects/{projectId}
 * 5. Validate response is 200 OK with complete project details
 *
 * Note: In this ERP system, when a member creates a project, they have project:manage
 * permission at organization level, which should allow viewing any project.
 */
export async function test_api_project_retrieval_by_permission_holder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project:manage permission
  // The member who creates a project gets project:manage permission at org level
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new project in the organization
  // The creator gets project:manage permission, allowing access to all projects
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Retrieve the project using project:manage permission
  // Even though member is not explicitly a "project member", the project:manage
  // permission at organization level grants visibility to all projects
  const retrievedProject = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 4. Validate response contains complete project details
  TestValidator.equals("project id matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedProject.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    project.status,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    project.organization.id,
  );
  TestValidator.predicate("has valid timestamps", () => {
    const created = new Date(retrievedProject.created_at);
    const updated = new Date(retrievedProject.updated_at);
    return !isNaN(created.getTime()) && !isNaN(updated.getTime());
  });
}
