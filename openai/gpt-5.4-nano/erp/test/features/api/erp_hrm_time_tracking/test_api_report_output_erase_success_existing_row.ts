import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_output_erase_success_existing_row(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  // If SDK is in simulation mode, the call won't require a real existing UUID.
  // In non-simulation mode, provided materials do not include any APIs to create
  // or fetch an existing report output row, so deletion preconditions cannot be ensured.
  const reportOutputId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrmTimeTracking.reportOutputs.erase(actorConnection, {
    reportOutputId,
  });
}
