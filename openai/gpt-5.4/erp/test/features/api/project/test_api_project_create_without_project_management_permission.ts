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

export async function test_api_project_create_without_project_management_permission(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    name: `project-${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    color_code: "#aa11cc",
    status: "active",
    budget_hours: 40,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IHrmTimeTrackingProject.ICreate;
  await TestValidator.httpError(
    "project creation requires project management permission",
    [401, 403],
    async () => {
      await generate_random_hrm_time_tracking_projects_create(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
