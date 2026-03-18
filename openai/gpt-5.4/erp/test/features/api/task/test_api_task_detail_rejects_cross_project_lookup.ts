import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_detail_rejects_cross_project_lookup(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeHref = typia.random<string & tags.Format<"uri">>();
  const employeeReferrer = typia.random<string & tags.Format<"uri">>();
  const employeeIp = typia.random<string & tags.Format<"ipv4">>();
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: employeeIp,
    },
  });
  typia.assert(employeeAuth);
  const firstProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(firstProject);
  const secondProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(secondProject);
  const firstMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: firstProject.id },
        body: {
          employee_id: employeeAuth.id,
          membership_role: "member",
        },
      },
    );
  typia.assert(firstMembership);
  TestValidator.equals(
    "first project membership employee matches",
    firstMembership.employee.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "first project membership project matches",
    firstMembership.project.id,
    firstProject.id,
  );
  const secondMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      ownerConnection,
      {
        params: { projectId: secondProject.id },
        body: {
          employee_id: employeeAuth.id,
          membership_role: "member",
        },
      },
    );
  typia.assert(secondMembership);
  TestValidator.equals(
    "second project membership employee matches",
    secondMembership.employee.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "second project membership project matches",
    secondMembership.project.id,
    secondProject.id,
  );
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: firstProject.id },
      body: {
        hrm_time_tracking_employee_id: employeeAuth.id,
        parent_id: null,
      },
    },
  );
  typia.assert(task);
  TestValidator.equals(
    "task belongs to first project",
    task.project.id,
    firstProject.id,
  );
  TestValidator.predicate(
    "task is assigned to the employee",
    task.assignee !== null,
  );
  TestValidator.equals(
    "task assignee matches employee",
    task.assignee!.id,
    employeeAuth.id,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLogin = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: employeeIp,
    },
  });
  typia.assert(employeeLogin);
  await TestValidator.error(
    "cross-project task lookup is rejected",
    async () => {
      await api.functional.hrmTimeTracking.projects.tasks.at(
        employeeConnection,
        {
          projectId: secondProject.id,
          taskId: task.id,
        },
      );
    },
  );
}
