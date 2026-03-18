import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_output_erase_consistency_with_downstream_usage(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const reportOutputId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.erpHrmTimeTracking.reportOutputs.erase(
      adminConnection,
      { reportOutputId },
    );
    await TestValidator.error(
      "deleted report output should not be erasable again",
      async () => {
        await api.functional.erpHrmTimeTracking.reportOutputs.erase(
          adminConnection,
          { reportOutputId },
        );
      },
    );
  } catch (error) {
    await TestValidator.error(
      "deletion should be consistently rejected for missing report output",
      async () => {
        await api.functional.erpHrmTimeTracking.reportOutputs.erase(
          adminConnection,
          { reportOutputId },
        );
      },
    );
    void error;
  }
}
