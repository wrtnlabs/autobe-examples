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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

// Extended interface to include id property that exists at runtime
interface IErpHrmProjectWithId extends IErpHrmProject {
  id: string;
}

export async function test_api_timer_start_by_active_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin (who becomes employee when organization is created)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create an organization (admin automatically becomes owner/employee)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // Cast to extended type with id property
  const projectWithId = project as IErpHrmProjectWithId;
  // 4. Set organization context for the admin (who is already an employee)
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgContext);
  // 5. Admin assigns themselves to the project
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectWithId.id,
    },
    body: {
      employeeId: orgContext.employee.id,
      assignedRole: "member",
    },
  });
  // 6. Set organization context again after assignment
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 7. Start a timer for the employee
  const timer = await api.functional.erpHrm.member.timers.create(
    adminConnection,
    {
      body: {
        erpHrmProjectId: projectWithId.id,
        description: "Test timer for active employee",
      },
    },
  );
  typia.assert(timer);
  // 8. Validate timer response
  TestValidator.equals("timer has valid id", timer.id.length > 0, true);
  TestValidator.equals(
    "timer has startedAt timestamp",
    !!timer.startedAt,
    true,
  );
  TestValidator.equals(
    "timer employee id matches",
    timer.employee.id,
    orgContext.employee.id,
  );
  TestValidator.equals(
    "timer project id matches",
    timer.project.id,
    projectWithId.id,
  );
  TestValidator.equals(
    "timer description matches",
    timer.description,
    "Test timer for active employee",
  );
}