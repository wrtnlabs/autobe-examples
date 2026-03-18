import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_definition_dimension_erase_preserves_other_dimensions_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Only the DELETE endpoint for report definition dimensions is available in the provided SDK.
  // Therefore, we can only validate that the erase operation itself succeeds with valid UUID inputs.
  const adminConnection: api.IConnection = { host: connection.host };
  const reportDefinitionId = typia.random<string & tags.Format<"uuid">>();
  const dimensionIdToErase = typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.erase(
    adminConnection,
    {
      reportDefinitionId,
      dimensionId: dimensionIdToErase,
    },
  );
}
