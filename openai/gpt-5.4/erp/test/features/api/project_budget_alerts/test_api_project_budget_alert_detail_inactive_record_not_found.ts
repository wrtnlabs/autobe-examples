import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectBudgetAlert";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_project_budget_alert_detail_inactive_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  const viewerConnection: api.IConnection = {
    ...connection,
  };
  await TestValidator.httpError(
    "inactive project budget alert detail is not found",
    404,
    async () => {
      await api.functional.hrmTimeTracking.projectBudgetAlerts.at(
        viewerConnection,
        {
          projectBudgetAlertId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
