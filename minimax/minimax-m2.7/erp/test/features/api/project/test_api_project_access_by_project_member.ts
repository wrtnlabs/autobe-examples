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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_access_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a member (employee) account with explicit credentials for later login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(memberAuth);
  // 4. Assign the member to the project as a project member
  const memberProjectAssignment =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: project.id,
      body: {
        name: project.name,
        color: project.color,
        status: typia.assert<"active" | "archived" | "completed">(project.status),
      } satisfies IErpHrmProjectMember.ICreate,
    });
  typia.assert(memberProjectAssignment);
  // 5. Authenticate as the member via login (new session)
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLoginAuth = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member-dashboard",
      referrer: "https://example.com/login",
    } satisfies IErpHrmMember.ILogin,
  });
  typia.assert(memberLoginAuth);
  // 6. Call GET /erpHrm/admin/projects/{projectId} using the member's session
  const projectDetails = await api.functional.erpHrm.admin.projects.at(
    memberLoginConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(projectDetails);
  // 7. Verify the member can successfully retrieve project details
  TestValidator.equals("project ID matches", projectDetails.id, project.id);
  TestValidator.equals(
    "project name matches",
    projectDetails.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    projectDetails.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    projectDetails.status,
    project.status,
  );
  // 8. Confirm the response includes project attributes and nested summaries
  TestValidator.predicate(
    "has project_members_count",
    typeof projectDetails.project_members_count === "number",
  );
  TestValidator.predicate(
    "has tasks_count",
    typeof projectDetails.tasks_count === "number",
  );
  TestValidator.predicate(
    "has nested tasks array",
    Array.isArray(projectDetails.tasks),
  );
  TestValidator.predicate(
    "has nested timelogs array",
    Array.isArray(projectDetails.timelogs),
  );
  TestValidator.predicate(
    "has nested timers array",
    Array.isArray(projectDetails.timers),
  );
}