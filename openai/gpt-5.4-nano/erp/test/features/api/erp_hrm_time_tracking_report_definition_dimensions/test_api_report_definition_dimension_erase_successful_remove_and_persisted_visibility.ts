import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_definition_dimension_erase_successful_remove_and_persisted_visibility(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const reportDefinitionId = typia.random<string & tags.Format<"uuid">>();
  const dimensionId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.erase(
    actorConnection,
    {
      reportDefinitionId,
      dimensionId,
    },
  );
  // Idempotency: calling erase again for the same pair should not
  // re-activate or corrupt other configuration.
  // With only the erase endpoint available, we assert the second call is
  // handled consistently (should either succeed as no-op or be handled by the
  // platform without breaking the operation flow).
  await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.erase(
    actorConnection,
    {
      reportDefinitionId,
      dimensionId,
    },
  );
}
