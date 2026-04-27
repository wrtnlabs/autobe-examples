import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";

export async function test_api_timelog_project_reassignment_to_another_assigned_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization (member becomes owner/employee)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to get updated member info with employee record
  const loginAuthorized = await authorize_member_login(memberConnection, {
    body: { email, password } as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(loginAuthorized);
  const employee: IHrmTimeTrackingEmployee.ISummary =
    loginAuthorized.employees[0];
  // 4. Create project A
  const projectA =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectA);
  // 5. Create project B
  const projectB =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectB);
  // 6. Add employee as member of project A
  const projectMemberA =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: employee.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMemberA);
  // 7. Add employee as member of project B
  const projectMemberB =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: employee.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(projectMemberB);
  // 8. Create timelog against project A
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: projectA.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
          >(),
        },
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "initial project matches project A",
    timelog.project.id,
    projectA.id,
  );
  // 9. Update timelog - reassign to project B
  const updatedTimelog =
    await api.functional.hrmTimeTracking.member.timelogs.update(
      memberConnection,
      {
        timelogId: timelog.id,
        body: {
          project_id: projectB.id,
        } satisfies IHrmTimeTrackingTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimelog);
  // 10. Verify project was reassigned to project B
  TestValidator.equals(
    "reassigned project is project B",
    updatedTimelog.project.id,
    projectB.id,
  );
  // 11. Edge case: create project C and do NOT add the employee as member
  const projectC =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectC);
  // 12. Attempt to reassign timelog to project C - should fail with 422
  await TestValidator.httpError(
    "reassign to non-member project should fail",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            project_id: projectC.id,
          } satisfies IHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
}
