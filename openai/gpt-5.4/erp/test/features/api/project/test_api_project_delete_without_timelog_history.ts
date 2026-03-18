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

export async function test_api_project_delete_without_timelog_history(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const createBody = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#33aa77",
    status: "active",
    budget_hours: 120,
    start_date: startDate,
    end_date: endDate,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: createBody,
    },
  );
  typia.assert(project);
  TestValidator.equals(
    "created project name matches input",
    project.name,
    createBody.name,
  );
  TestValidator.equals(
    "created project color matches input",
    project.colorCode,
    createBody.color_code,
  );
  TestValidator.equals(
    "created project status matches input",
    project.status,
    createBody.status,
  );
  TestValidator.equals(
    "created project description matches input",
    project.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created project budget matches input",
    project.budgetHours,
    createBody.budget_hours ?? null,
  );
  await api.functional.hrmTimeTracking.projects.erase(actorConnection, {
    projectId: project.id,
  });
}
