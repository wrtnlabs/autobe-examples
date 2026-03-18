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

export async function test_api_project_update_status_reflects_in_scoped_views(
  connection: api.IConnection,
): Promise<void> {
  const projectConnection: api.IConnection = {
    host: connection.host,
  };
  const initialStatus = "active";
  const nextStatus = RandomGenerator.pick(["archived", "completed"] as const);
  const created = await generate_random_hrm_time_tracking_projects_create(
    projectConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#2255aa",
        status: initialStatus,
        budget_hours: 120,
        start_date: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        end_date: new Date("2026-02-01T00:00:00.000Z").toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(created);
  const updateBody = {
    name: `updated-${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    colorCode: "#3366cc",
    status: nextStatus,
    budgetHours: 240,
    startDate: new Date("2026-03-01T00:00:00.000Z").toISOString(),
    endDate: new Date("2026-04-01T00:00:00.000Z").toISOString(),
  } satisfies IHrmTimeTrackingProject.IUpdate;
  const updated = await api.functional.hrmTimeTracking.projects.update(
    projectConnection,
    {
      projectId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "created project starts as active",
    created.status,
    initialStatus,
  );
  TestValidator.equals("project id is preserved", updated.id, created.id);
  TestValidator.equals(
    "organization id is preserved",
    updated.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "organization name is preserved",
    updated.organization.name,
    created.organization.name,
  );
  TestValidator.equals("status is updated", updated.status, nextStatus);
  TestValidator.notEquals(
    "status changes from original lifecycle state",
    updated.status,
    created.status,
  );
  TestValidator.equals("name is updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description is updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "color code is updated",
    updated.colorCode,
    updateBody.colorCode,
  );
  TestValidator.equals(
    "budget hours is updated",
    updated.budgetHours,
    updateBody.budgetHours,
  );
  TestValidator.equals(
    "start date is updated",
    updated.startDate,
    updateBody.startDate,
  );
  TestValidator.equals(
    "end date is updated",
    updated.endDate,
    updateBody.endDate,
  );
  TestValidator.notEquals(
    "updatedAt changes after update",
    updated.updatedAt,
    created.updatedAt,
  );
}
