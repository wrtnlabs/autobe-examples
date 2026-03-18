import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_output_erase_denied_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  const callerConnection: api.IConnection = { host: connection.host };
  const crossOrganizationReportOutputId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should deny cross-organization report output erase",
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputs.erase(
        callerConnection,
        {
          reportOutputId: crossOrganizationReportOutputId,
        },
      );
    },
  );
}
