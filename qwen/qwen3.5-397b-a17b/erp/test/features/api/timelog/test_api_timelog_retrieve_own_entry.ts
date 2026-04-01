import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_retrieve_own_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (automatically creates employee record)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization as active context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project (member ID = employee ID after organization creation)
  await generate_random_hrm_platform_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        hrm_platform_employee_id: memberAuth.id,
        role: "member",
      },
    },
  );
  // 6. Create timelog entry
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: 60,
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 7. Retrieve the timelog by ID
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 8. Validate all fields match
  TestValidator.equals("timelog ID matches", timelog.id, retrievedTimelog.id);
  TestValidator.equals(
    "employee ID matches",
    timelog.employee.id,
    retrievedTimelog.employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    timelog.project.id,
    retrievedTimelog.project.id,
  );
  TestValidator.equals(
    "work date matches",
    timelog.date,
    retrievedTimelog.date,
  );
  TestValidator.equals(
    "duration matches",
    timelog.durationMinutes,
    retrievedTimelog.durationMinutes,
  );
  TestValidator.equals(
    "description matches",
    timelog.description,
    retrievedTimelog.description,
  );
  TestValidator.equals(
    "billable flag matches",
    timelog.billable,
    retrievedTimelog.billable,
  );
  // Validate employee structure
  TestValidator.predicate(
    "employee has user profile",
    retrievedTimelog.employee.user !== null,
  );
  TestValidator.predicate(
    "employee has role",
    retrievedTimelog.employee.role !== null,
  );
  TestValidator.predicate(
    "employee has employment type",
    retrievedTimelog.employee.employment_type !== null,
  );
  TestValidator.predicate(
    "employee status is active",
    retrievedTimelog.employee.status === "active",
  );
  // Validate project structure
  TestValidator.equals(
    "project name matches",
    project.name,
    retrievedTimelog.project.name,
  );
  TestValidator.equals(
    "project color matches",
    project.color_code,
    retrievedTimelog.project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    project.status,
    retrievedTimelog.project.status,
  );
  // Validate task is null (no task assigned)
  TestValidator.equals("task is null", retrievedTimelog.task, null);
  // Validate timesheet is null (new timelog not yet in timesheet)
  TestValidator.equals("timesheet is null", retrievedTimelog.timesheet, null);
  // Validate timestamps exist
  TestValidator.predicate(
    "createdAt exists",
    retrievedTimelog.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt exists",
    retrievedTimelog.updatedAt !== null,
  );
  TestValidator.equals("deletedAt is null", retrievedTimelog.deletedAt, null);
}
