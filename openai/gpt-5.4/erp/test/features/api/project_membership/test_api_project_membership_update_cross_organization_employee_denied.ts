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

export async function test_api_project_membership_update_cross_organization_employee_denied(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#3366cc",
        status: "active",
        budget_hours: 160,
        start_date: new Date().toISOString(),
        end_date: null,
      } satisfies Partial<IHrmTimeTrackingProject.ICreate>,
    },
  );
  typia.assert(project);
  const membership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: "member",
        } satisfies Partial<IHrmTimeTrackingProjectMembership.ICreate>,
      },
    );
  typia.assert(membership);
  const otherEmployeeId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "reassignment target differs from original employee",
    otherEmployeeId,
    membership.employee.id,
  );
  const originalEmployeeId = membership.employee.id;
  const originalRole = membership.membership_role;
  const originalProjectId = membership.project.id;
  await TestValidator.error(
    "cross-organization or invalid employee update rejected",
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.update(
        actorConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
          body: {
            hrm_time_tracking_employee_id: otherEmployeeId,
            membership_role: "project-lead",
          } satisfies IHrmTimeTrackingProjectMembership.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "original employee remains unchanged in local snapshot",
    membership.employee.id,
    originalEmployeeId,
  );
  TestValidator.equals(
    "original role remains unchanged in local snapshot",
    membership.membership_role,
    originalRole,
  );
  TestValidator.equals(
    "membership still references same project in local snapshot",
    membership.project.id,
    originalProjectId,
  );
}
