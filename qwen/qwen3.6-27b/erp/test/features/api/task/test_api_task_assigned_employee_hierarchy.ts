import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_assigned_employee_hierarchy(
  connection: api.IConnection,
) {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          memberId: member.id,
        },
      },
    );
  typia.assert(employee);
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  const membership: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: employee.id,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership);
  const task: IHrmPlatformTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          assigned_employee_id: employee.id,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  const retrievedTask: IHrmPlatformTask =
    await api.functional.hrmPlatform.member.tasks.at(memberConnection, {
      taskId: task.id,
    });
  typia.assert(retrievedTask);
  TestValidator.predicate(
    "assignedEmployee is not null",
    retrievedTask.assignedEmployee !== null,
  );
  TestValidator.equals(
    "assignedEmployee id matches created employee",
    retrievedTask.assignedEmployee!.id,
    employee.id,
  );
  TestValidator.predicate(
    "assignedEmployee status is active",
    retrievedTask.assignedEmployee!.status === "active",
  );
  TestValidator.predicate(
    "parentTask is null for top-level task",
    retrievedTask.parentTask === null,
  );
}
