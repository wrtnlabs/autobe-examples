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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: { email },
  });
  // Step 2: Create a new organization (member becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a new active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  TestValidator.equals("project status is active", project.status, "active");
  // Step 4: Assign the authenticated member as a project member
  // The owner's organization member ID is organization.owner.id
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: organization.owner.id,
          projectRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 5: Create a timelog entry with specific values
  const workDate = new Date().toISOString();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: workDate,
        duration_minutes: 90 as number & tags.Type<"int32"> & tags.Minimum<1>,
        billable: false,
      },
    },
  );
  typia.assert(timelog);
  // Test execution: Retrieve the timelog by ID
  const retrieved = await api.functional.erpHrm.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrieved);
  // Validation points
  TestValidator.equals("timelog id matches", retrieved.id, timelog.id);
  TestValidator.equals(
    "owner id matches organization owner",
    retrieved.owner.id,
    organization.owner.id,
  );
  TestValidator.equals(
    "owner member email matches registration email",
    retrieved.owner.member.email,
    email,
  );
  TestValidator.equals("project id matches", retrieved.project.id, project.id);
  TestValidator.equals(
    "project status is active",
    retrieved.project.status,
    "active",
  );
  TestValidator.equals("task is null", retrieved.task, null);
  TestValidator.equals("timesheet is null", retrieved.timesheet, null);
  TestValidator.equals("locked is false", retrieved.locked, false);
  TestValidator.equals(
    "duration_minutes is 90",
    retrieved.duration_minutes,
    90,
  );
  TestValidator.equals("billable is false", retrieved.billable, false);
  TestValidator.equals("description is null", retrieved.description, null);
}
