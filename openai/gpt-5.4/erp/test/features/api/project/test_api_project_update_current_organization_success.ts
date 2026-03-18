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

export async function test_api_project_update_current_organization_success(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const created: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(actorConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#11aa22",
        status: "active",
        budget_hours: 40,
        start_date: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 7,
        ).toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    });
  typia.assert(created);
  const supportedStatuses = ["active", "archived", "completed"] as const;
  const updateBody = {
    name: `updated-${RandomGenerator.alphabets(10)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    colorCode: "#3344cc",
    status: RandomGenerator.pick(supportedStatuses),
    budgetHours: 120,
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  } satisfies IHrmTimeTrackingProject.IUpdate;
  const updated: IHrmTimeTrackingProject =
    await api.functional.hrmTimeTracking.projects.update(actorConnection, {
      projectId: created.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals("project id preserved", updated.id, created.id);
  TestValidator.equals(
    "organization preserved",
    updated.organization,
    created.organization,
  );
  TestValidator.equals(
    "createdAt preserved",
    updated.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "deletedAt preserved",
    updated.deletedAt,
    created.deletedAt,
  );
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "color updated",
    updated.colorCode,
    updateBody.colorCode,
  );
  TestValidator.equals("status updated", updated.status, updateBody.status);
  TestValidator.equals(
    "budget hours updated",
    updated.budgetHours,
    updateBody.budgetHours,
  );
  TestValidator.equals(
    "start date updated",
    updated.startDate,
    updateBody.startDate,
  );
  TestValidator.equals("end date updated", updated.endDate, updateBody.endDate);
  TestValidator.predicate(
    "updatedAt moved forward",
    new Date(updated.updatedAt).getTime() >
      new Date(created.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "status is supported lifecycle state",
    ArrayUtil.has(supportedStatuses, (status) => status === updated.status),
  );
}
