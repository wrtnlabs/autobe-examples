import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_memberships_create } from "../../../generate/generate_random_hrm_time_tracking_projects_memberships_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_hrm_time_tracking_project_membership";

export async function test_api_project_membership_removal_preserves_other_project_assignments(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const projectOne = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#123abc",
        status: "active",
      } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(projectOne);
  const membershipOne =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: projectOne.id,
        },
        body: {
          membership_role: "member",
        } satisfies Partial<IHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membershipOne);
  const employee: IHrmTimeTrackingEmployee.ISummary = membershipOne.employee;
  const projectTwo = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#456def",
        status: "active",
      } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(projectTwo);
  const membershipTwo =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: projectTwo.id,
        },
        body: {
          employee_id: employee.id,
          membership_role: "project-lead",
        } satisfies Partial<IHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membershipTwo);
  TestValidator.equals(
    "same employee is assigned to both memberships",
    membershipTwo.employee.id,
    employee.id,
  );
  TestValidator.notEquals(
    "memberships are distinct assignments",
    membershipOne.id,
    membershipTwo.id,
  );
  TestValidator.notEquals(
    "projects are distinct across memberships",
    membershipOne.project.id,
    membershipTwo.project.id,
  );
  TestValidator.equals(
    "first membership belongs to first project before deletion",
    membershipOne.project.id,
    projectOne.id,
  );
  TestValidator.equals(
    "second membership belongs to second project before deletion",
    membershipTwo.project.id,
    projectTwo.id,
  );
  await api.functional.hrmTimeTracking.projects.memberships.erase(
    actorConnection,
    {
      projectId: projectOne.id,
      membershipId: membershipOne.id,
    },
  );
  TestValidator.equals(
    "remaining membership still references same employee",
    membershipTwo.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "remaining membership still belongs to second project",
    membershipTwo.project.id,
    projectTwo.id,
  );
  TestValidator.equals(
    "remaining membership role is preserved",
    membershipTwo.membership_role,
    "project-lead",
  );
  await TestValidator.error(
    "deleted membership cannot be removed again",
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.erase(
        actorConnection,
        {
          projectId: projectOne.id,
          membershipId: membershipOne.id,
        },
      );
    },
  );
}
