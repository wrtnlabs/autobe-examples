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

export async function test_api_project_budget_alert_detail_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const insightConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "random same-organization alert id without prior listing should not yield a detail record",
    async () => {
      await api.functional.hrmTimeTracking.projectBudgetAlerts.at(
        insightConnection,
        {
          projectBudgetAlertId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
