import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_own_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(employeeConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeConnection,
      {},
    );
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {},
  );
  // 4. Create organization member record
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  // 6. Assign employee to project
  await generate_random_erp_hrm_member_projects_members_create(
    employeeConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // 7. Create timelog entry
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  const createdTimelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: true,
        description: "Test work session for retrieval",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  // 8. Retrieve the timelog
  const retrievedTimelog = await api.functional.erpHrm.member.timelogs.at(
    employeeConnection,
    {
      timelogId: createdTimelog.id,
    },
  );
  // 9. Validate response structure
  typia.assert(retrievedTimelog);
  // 10. Validate business logic
  TestValidator.equals(
    "timelog id matches",
    retrievedTimelog.id,
    createdTimelog.id,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimelog.project.name,
    project.name,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    createdTimelog.billable,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimelog.description,
    createdTimelog.description,
  );
  TestValidator.equals(
    "duration minutes calculated correctly",
    retrievedTimelog.durationMinutes,
    createdTimelog.durationMinutes,
  );
  TestValidator.equals(
    "organization member id matches",
    retrievedTimelog.organizationMember.id,
    organizationMember.id,
  );
  TestValidator.predicate(
    "timesheet is null for unlinked timelog",
    retrievedTimelog.timesheet === null,
  );
  TestValidator.predicate(
    "task is null when not specified",
    retrievedTimelog.task === null,
  );
}
