import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_update_organization_scope_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const scopedConnection: api.IConnection = { host: connection.host };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(scopedConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#11aa22",
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    });
  typia.assert(project);
  const original: IHrmTimeTrackingProject = {
    ...project,
    organization: { ...project.organization },
  };
  const updateBody = {
    name: `forbidden-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    colorCode: "#aa2211",
    status: "archived",
    budgetHours: 88,
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  } satisfies IHrmTimeTrackingProject.IUpdate;
  TestValidator.notEquals(
    "update payload changes name",
    updateBody.name,
    project.name,
  );
  TestValidator.notEquals(
    "update payload changes description",
    updateBody.description ?? null,
    project.description,
  );
  TestValidator.notEquals(
    "update payload changes color",
    updateBody.colorCode,
    project.colorCode,
  );
  TestValidator.notEquals(
    "update payload changes status",
    updateBody.status,
    project.status,
  );
  await TestValidator.error(
    "project update outside scoped authorization is forbidden",
    async () => {
      await api.functional.hrmTimeTracking.projects.update(scopedConnection, {
        projectId: project.id,
        body: updateBody,
      });
    },
  );
  TestValidator.equals(
    "original snapshot remains unchanged",
    project,
    original,
  );
}
