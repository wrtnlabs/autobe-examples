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

export async function test_api_project_delete_blocked_by_historical_timelog(
  connection: api.IConnection,
): Promise<void> {
  const projectConnection: api.IConnection = { host: connection.host };
  const createBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    color_code: "#a1b2c3",
    status: "active",
    budget_hours: 40,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(projectConnection, {
      body: createBody,
    });
  typia.assert(project);
  TestValidator.equals("project name matches", project.name, createBody.name);
  TestValidator.equals(
    "project description matches",
    project.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "project status matches",
    project.status,
    createBody.status,
  );
  await TestValidator.error(
    "project deletion is blocked when historical timelog exists",
    async () => {
      await api.functional.hrmTimeTracking.projects.erase(projectConnection, {
        projectId: project.id,
      });
    },
  );
}
