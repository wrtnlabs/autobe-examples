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

export async function test_api_project_detail_current_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = {
    host: connection.host,
  };
  const projectName: string = `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`;
  const projectDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });
  const projectStatus = RandomGenerator.pick([
    "active",
    "archived",
    "completed",
  ] as const);
  const projectBudgetHours: number = 120;
  const created: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(userConnection, {
      body: {
        name: projectName,
        description: projectDescription,
        color_code: "#12ab34",
        status: projectStatus,
        budget_hours: projectBudgetHours,
      },
    });
  typia.assert(created);
  TestValidator.equals(
    "created project name matches",
    created.name,
    projectName,
  );
  TestValidator.equals(
    "created project description matches",
    created.description,
    projectDescription,
  );
  TestValidator.equals(
    "created project status matches",
    created.status,
    projectStatus,
  );
  TestValidator.equals(
    "created project budget hours matches",
    created.budgetHours,
    projectBudgetHours,
  );
  const found: IHrmTimeTrackingProject =
    await api.functional.hrmTimeTracking.projects.at(userConnection, {
      projectId: created.id,
    });
  typia.assert(found);
  TestValidator.equals("detail project id matches", found.id, created.id);
  TestValidator.equals("detail project name matches", found.name, created.name);
  TestValidator.equals(
    "detail project description matches",
    found.description,
    created.description,
  );
  TestValidator.equals(
    "detail project color matches",
    found.colorCode,
    created.colorCode,
  );
  TestValidator.equals(
    "detail project status matches",
    found.status,
    created.status,
  );
  TestValidator.equals(
    "detail project organization id matches",
    found.organization.id,
    created.organization.id,
  );
  await TestValidator.httpError(
    "missing project id lookup is rejected",
    [404, 403],
    async () => {
      await api.functional.hrmTimeTracking.projects.at(userConnection, {
        projectId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
