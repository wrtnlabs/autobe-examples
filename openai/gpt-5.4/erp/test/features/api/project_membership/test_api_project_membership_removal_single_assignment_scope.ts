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

export async function test_api_project_membership_removal_single_assignment_scope(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const firstProject: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(managerConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3366cc",
        status: "active",
        budget_hours: null,
        start_date: new Date().toISOString(),
        end_date: null,
      },
    });
  typia.assert(firstProject);
  const firstMembership: IHrmTimeTrackingProjectMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: firstProject.id,
        },
        body: {
          membership_role: "member",
        },
      },
    );
  typia.assert(firstMembership);
  const secondProject: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(managerConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#cc6633",
        status: "active",
        budget_hours: null,
        start_date: new Date().toISOString(),
        end_date: null,
      },
    });
  typia.assert(secondProject);
  const secondMembership: IHrmTimeTrackingProjectMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      managerConnection,
      {
        params: {
          projectId: secondProject.id,
        },
        body: {
          employee_id: firstMembership.employee.id,
          membership_role: "project-lead",
        },
      },
    );
  typia.assert(secondMembership);
  TestValidator.equals(
    "first membership belongs to first project",
    firstMembership.project.id,
    firstProject.id,
  );
  TestValidator.equals(
    "second membership belongs to second project",
    secondMembership.project.id,
    secondProject.id,
  );
  TestValidator.equals(
    "memberships share same employee",
    secondMembership.employee.id,
    firstMembership.employee.id,
  );
  TestValidator.notEquals(
    "memberships are different assignments",
    firstMembership.id,
    secondMembership.id,
  );
  const erased: void =
    await api.functional.hrmTimeTracking.projects.memberships.erase(
      managerConnection,
      {
        projectId: firstProject.id,
        membershipId: firstMembership.id,
      },
    );
  TestValidator.equals("delete returns no content", erased, undefined);
  TestValidator.equals(
    "unrelated membership keeps its project assignment",
    secondMembership.project.id,
    secondProject.id,
  );
  TestValidator.equals(
    "unrelated membership keeps the same employee assignment",
    secondMembership.employee.id,
    firstMembership.employee.id,
  );
}
