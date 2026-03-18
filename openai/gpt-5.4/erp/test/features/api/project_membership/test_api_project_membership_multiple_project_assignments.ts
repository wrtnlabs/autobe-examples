import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function test_api_project_membership_multiple_project_assignments(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_manager_join(managerConnection, {
    body: {},
  });
  typia.assert(manager);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_employee_join(employeeConnection, {
    body: {},
  });
  typia.assert(employee);
  const firstProject = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#112233",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(firstProject);
  const secondProject = await generate_random_hrm_time_tracking_projects_create(
    managerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#445566",
        status: "active",
        budget_hours: 240,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(secondProject);
  const firstMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: firstProject.id,
        },
        body: {
          employee_id: employee.id,
          membership_role: "member",
        } satisfies IHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(firstMembership);
  const secondMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: secondProject.id,
        },
        body: {
          employee_id: employee.id,
          membership_role: "project-lead",
        } satisfies IHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(secondMembership);
  TestValidator.notEquals(
    "separate membership records are created per project",
    firstMembership.id,
    secondMembership.id,
  );
  TestValidator.equals(
    "second membership preserves requested role",
    secondMembership.membership_role,
    "project-lead",
  );
  TestValidator.equals(
    "second membership references second project",
    secondMembership.project.id,
    secondProject.id,
  );
  TestValidator.notEquals(
    "second membership does not overwrite first project assignment",
    secondMembership.project.id,
    firstMembership.project.id,
  );
  TestValidator.equals(
    "second membership keeps same employee",
    secondMembership.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "first membership remains bound to first project",
    firstMembership.project.id,
    firstProject.id,
  );
  TestValidator.equals(
    "same employee can be assigned independently to multiple projects",
    firstMembership.employee.id,
    secondMembership.employee.id,
  );
}
