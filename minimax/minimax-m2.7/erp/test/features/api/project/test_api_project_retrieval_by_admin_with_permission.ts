import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_retrieval_by_admin_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to obtain JWT tokens
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a new project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Call GET /erpHrm/admin/projects/{projectId} using the created project ID
  const retrievedProject = await api.functional.erpHrm.admin.projects.at(
    adminConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(retrievedProject);
  // 4. Validate response returns complete project entity
  TestValidator.equals("project ID matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project description matches",
    retrievedProject.description,
    project.description,
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
  // 5. Validate organization context is populated
  TestValidator.predicate(
    "organization is populated",
    retrievedProject.organization !== null &&
      retrievedProject.organization !== undefined,
  );
  TestValidator.equals(
    "organization ID exists",
    retrievedProject.organization.id !== null,
    true,
  );
  // 6. Validate HAS-MANY compositions are arrays
  TestValidator.predicate(
    "projectMemberships is array",
    Array.isArray(retrievedProject.projectMemberships),
  );
  TestValidator.predicate(
    "tasks is array",
    Array.isArray(retrievedProject.tasks),
  );
  TestValidator.predicate(
    "timelogs is array",
    Array.isArray(retrievedProject.timelogs),
  );
  TestValidator.predicate(
    "timers is array",
    Array.isArray(retrievedProject.timers),
  );
  // 7. Validate aggregation counts
  TestValidator.predicate(
    "tasks_count is number",
    typeof retrievedProject.tasks_count === "number",
  );
  TestValidator.predicate(
    "project_members_count is number",
    typeof retrievedProject.project_members_count === "number",
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    retrievedProject.created_at !== null &&
      retrievedProject.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProject.updated_at !== null &&
      retrievedProject.updated_at !== undefined,
  );
  // 9. Validate project status values
  const validStatuses = ["active", "archived", "completed"];
  TestValidator.predicate(
    "status is valid",
    validStatuses.includes(retrievedProject.status),
  );
}
