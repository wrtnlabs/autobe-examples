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

export async function test_api_project_membership_detail_project_path_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = {
    host: connection.host,
  };
  const firstProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {},
  );
  typia.assert(firstProject);
  const secondProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {},
  );
  typia.assert(secondProject);
  TestValidator.notEquals(
    "projects must be different",
    firstProject.id,
    secondProject.id,
  );
  const membership =
    await generate_random_hrm_time_tracking_projects_memberships_create(
      actorConnection,
      {
        params: {
          projectId: firstProject.id,
        },
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership belongs to first project",
    membership.project.id,
    firstProject.id,
  );
  TestValidator.notEquals(
    "membership project must not be second project",
    membership.project.id,
    secondProject.id,
  );
  await TestValidator.httpError(
    "retrieving membership through mismatched project path must fail",
    [400, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.projects.memberships.at(
        actorConnection,
        {
          projectId: secondProject.id,
          membershipId: membership.id,
        },
      );
    },
  );
}
