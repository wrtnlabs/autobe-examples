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

export async function test_api_project_membership_update_reassignment_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#a1b2c3",
        status: "active",
        budget_hours: null,
        start_date: new Date().toISOString(),
        end_date: null,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const firstMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: "member",
        },
      },
    );
  typia.assert(firstMembership);
  const secondMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: "project-lead",
        },
      },
    );
  typia.assert(secondMembership);
  TestValidator.notEquals(
    "memberships should belong to different employees",
    firstMembership.employee.id,
    secondMembership.employee.id,
  );
  TestValidator.equals(
    "first membership belongs to project",
    firstMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "second membership belongs to project",
    secondMembership.project.id,
    project.id,
  );
  const originalMembershipId = firstMembership.id;
  const originalEmployeeId = firstMembership.employee.id;
  const originalProjectId = firstMembership.project.id;
  const originalRole = firstMembership.membership_role;
  await TestValidator.error(
    "reassignment to an already assigned employee must be rejected",
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.update(
        actorConnection,
        {
          projectId: project.id,
          membershipId: firstMembership.id,
          body: {
            hrm_time_tracking_employee_id: secondMembership.employee.id,
          } satisfies IHrmTimeTrackingProjectMembership.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "original membership snapshot id remains unchanged",
    firstMembership.id,
    originalMembershipId,
  );
  TestValidator.equals(
    "original employee snapshot remains unchanged",
    firstMembership.employee.id,
    originalEmployeeId,
  );
  TestValidator.notEquals(
    "conflicting employee differs from original employee",
    originalEmployeeId,
    secondMembership.employee.id,
  );
  TestValidator.equals(
    "original project snapshot remains unchanged",
    firstMembership.project.id,
    originalProjectId,
  );
  TestValidator.equals(
    "original membership role snapshot remains unchanged",
    firstMembership.membership_role,
    originalRole,
  );
}
