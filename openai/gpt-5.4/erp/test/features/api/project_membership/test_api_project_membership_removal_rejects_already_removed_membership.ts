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

export async function test_api_project_membership_removal_rejects_already_removed_membership(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(actorConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#112233",
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  typia.assert(project);
  const membershipRole = "member" as const;
  const membership: IHrmTimeTrackingProjectMembership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          membership_role: membershipRole,
        },
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership belongs to created project",
    membership.project.id,
    project.id,
  );
  TestValidator.equals(
    "membership role matches input",
    membership.membership_role,
    membershipRole,
  );
  TestValidator.equals(
    "membership is initially active",
    membership.deleted_at,
    null,
  );
  TestValidator.predicate(
    "employee summary id is populated",
    membership.employee.id.length > 0,
  );
  const baselineMembershipId = membership.id;
  const baselineProjectId = membership.project.id;
  const baselineEmployeeId = membership.employee.id;
  const baselineMembershipRole = membership.membership_role;
  const baselineCreatedAt = membership.created_at;
  const baselineUpdatedAt = membership.updated_at;
  const baselineDeletedAt = membership.deleted_at;
  await api.functional.hrmTimeTracking.projects.memberships.erase(
    actorConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
  await TestValidator.error(
    "repeated membership removal is rejected after soft removal",
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.erase(
        actorConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
        },
      );
    },
  );
  TestValidator.equals(
    "project id snapshot remains unchanged after repeated delete attempt",
    baselineProjectId,
    project.id,
  );
  TestValidator.equals(
    "membership id snapshot remains unchanged after repeated delete attempt",
    baselineMembershipId,
    membership.id,
  );
  TestValidator.equals(
    "employee id snapshot remains unchanged after repeated delete attempt",
    baselineEmployeeId,
    membership.employee.id,
  );
  TestValidator.equals(
    "membership role snapshot remains unchanged after repeated delete attempt",
    baselineMembershipRole,
    membership.membership_role,
  );
  TestValidator.equals(
    "created timestamp snapshot remains unchanged after repeated delete attempt",
    baselineCreatedAt,
    membership.created_at,
  );
  TestValidator.equals(
    "updated timestamp snapshot remains unchanged locally after repeated delete attempt",
    baselineUpdatedAt,
    membership.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp snapshot remains null locally",
    baselineDeletedAt,
    membership.deleted_at,
  );
}
