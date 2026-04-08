import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_by_permission_holder(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create member A (who will create the timelog)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. Create member B (who will have time:view_all permission)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 4. Set organization context for member A
  const orgContextA =
    await generate_random_erp_hrm_member_organization_context_select(
      memberAConnection,
      {
        body: {
          organizationId: memberA.id,
        },
      },
    );
  typia.assert(orgContextA);
  // 5. Set member B to same organization
  await generate_random_erp_hrm_member_organization_context_select(
    memberBConnection,
    {
      body: {
        organizationId: orgContextA.organization.id,
      },
    },
  );
  // 6. Create project by admin
  const projectResponse = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#" + RandomGenerator.alphabets(6).toUpperCase(),
      },
    },
  );
  typia.assert(projectResponse);
  // 7. Extract project ID from the budget report response
  const projectId = projectResponse.items[0]?.projectId;
  // 8. Assign member A to the project
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectId ?? memberA.id,
    },
    body: {
      employeeId: orgContextA.employee.id,
      assignedRole: "member",
    },
  });
  // 9. Member A creates a timelog
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberAConnection,
    {
      body: {
        projectId: projectId ?? memberA.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
        description: "Test timelog for permission verification",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 10. Member B (with time:view_all permission) retrieves member A's timelog
  const retrievedTimelog = await api.functional.erpHrm.member.timelogs.at(
    memberBConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 11. Validate the retrieved timelog matches the original
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "timelog employee id matches",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "timelog project id matches",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "timelog duration matches",
    retrievedTimelog.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals(
    "timelog description matches",
    retrievedTimelog.description,
    timelog.description,
  );
}
