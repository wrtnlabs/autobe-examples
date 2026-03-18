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

export async function test_api_project_detail_employee_assigned_scope_only(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const body = {
    name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#3366ff",
    status: "active",
    budget_hours: 120,
  } satisfies IHrmTimeTrackingProject.ICreate;
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(ownerConnection, {
      body,
    });
  typia.assert(project);
  TestValidator.equals("created project name matches", project.name, body.name);
  TestValidator.equals(
    "created project description matches",
    project.description,
    body.description ?? null,
  );
  TestValidator.equals(
    "created project color matches",
    project.colorCode,
    body.color_code,
  );
  TestValidator.equals(
    "created project status matches",
    project.status,
    body.status,
  );
  TestValidator.equals(
    "created project budget hours matches",
    project.budgetHours,
    body.budget_hours ?? null,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "employee without current authorized scope cannot read protected project detail",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.projects.at(employeeConnection, {
        projectId: project.id,
      });
    },
  );
}
