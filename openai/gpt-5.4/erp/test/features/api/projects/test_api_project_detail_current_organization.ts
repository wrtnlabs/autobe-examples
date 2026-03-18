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

export async function test_api_project_detail_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const projectConnection: api.IConnection = {
    host: connection.host,
  };
  const statuses = ["active", "archived", "completed"] as const;
  const status = RandomGenerator.pick(statuses);
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const budgetHours = 120;
  const created = await generate_random_hrm_time_tracking_projects_create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description,
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        status,
        budget_hours: budgetHours,
        start_date: startDate,
        end_date: endDate,
      },
    },
  );
  typia.assert(created);
  const detail = await api.functional.hrmTimeTracking.projects.at(
    projectConnection,
    {
      projectId: created.id,
    },
  );
  typia.assert(detail);
  typia.assertEquals<IHrmTimeTrackingProject>(detail);
  TestValidator.equals("project id matches", detail.id, created.id);
  TestValidator.equals(
    "organization summary matches",
    detail.organization,
    created.organization,
  );
  TestValidator.equals("project name matches", detail.name, created.name);
  TestValidator.equals(
    "project description matches",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "project colorCode matches",
    detail.colorCode,
    created.colorCode,
  );
  TestValidator.equals("project status matches", detail.status, created.status);
  TestValidator.equals(
    "project budgetHours matches",
    detail.budgetHours,
    created.budgetHours,
  );
  TestValidator.equals(
    "project startDate matches",
    detail.startDate,
    created.startDate,
  );
  TestValidator.equals(
    "project endDate matches",
    detail.endDate,
    created.endDate,
  );
  TestValidator.equals(
    "project createdAt matches",
    detail.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "project updatedAt matches",
    detail.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "project deletedAt matches",
    detail.deletedAt,
    created.deletedAt,
  );
}
