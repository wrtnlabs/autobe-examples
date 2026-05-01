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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test that a non-member employee cannot retrieve a project they are not assigned to.
 *
 * Validates the dual-gate authorization for project retrieval: access requires either
 * project membership or the explicit project:view permission. Mere organization
 * membership is insufficient.
 *
 * 1. Member A joins the platform via authorize_member_join, creating an organization.
 * 2. Member A creates a project using generate_random_erp_hrm_member_projects_create.
 * 3. A unique email is generated for Member B. Member A invites Member B via
 *    generate_random_erp_hrm_member_employees_create, which creates a pending
 *    invitation since Member B does not yet exist.
 * 4. Member B joins with the invited email via authorize_member_join, which
 *    auto-resolves the pending invitation and adds Member B as an Employee with
 *    a default role lacking project:view permission.
 * 5. Member B attempts to retrieve the project via the at endpoint and receives
 *    a 403 Forbidden response, confirming that organization membership alone does
 *    not grant project access.
 */
export async function test_api_project_retrieval_non_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Generate email for Member B and invite
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await generate_random_erp_hrm_member_employees_create(memberAConnection, {
    body: { email: memberBEmail },
  });
  // 4. Member B joins with the invited email
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: { email: memberBEmail },
  });
  // 5. Member B tries to access the project — must receive 403
  await TestValidator.error(
    "non-member forbidden from project retrieval",
    async () => {
      await api.functional.erpHrm.member.projects.at(memberBConnection, {
        projectId: project.id,
      });
    },
  );
}
