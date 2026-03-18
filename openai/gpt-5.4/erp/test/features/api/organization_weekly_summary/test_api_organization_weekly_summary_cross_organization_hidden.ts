import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_organization_weekly_summary_cross_organization_hidden(
  connection: api.IConnection,
): Promise<void> {
  const scopedConnection: api.IConnection = {
    host: connection.host,
  };
  const organizationWeeklySummaryId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "direct weekly summary lookup without valid organization scope is rejected",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.organizationWeeklySummaries.at(
        scopedConnection,
        {
          organizationWeeklySummaryId,
        },
      );
    },
  );
}
