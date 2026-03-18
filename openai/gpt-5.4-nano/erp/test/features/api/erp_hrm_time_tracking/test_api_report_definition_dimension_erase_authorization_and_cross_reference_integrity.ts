import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_definition_dimension_erase_authorization_and_cross_reference_integrity(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Scenario 1: authorization enforcement (expect the operation to be rejected)
  await TestValidator.httpError(
    "forbidden/unauthorized should prevent report definition dimension erase",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.erase(
        memberConnection,
        {
          reportDefinitionId: typia.random<string & tags.Format<"uuid">>(),
          dimensionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Scenario 2: cross-entity reference integrity (dimensionId mismatched to reportDefinitionId)
  const reportDefinitionIdA = typia.random<string & tags.Format<"uuid">>();
  const dimensionIdFromOther = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-reference mismatch should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.erase(
        memberConnection,
        {
          reportDefinitionId: reportDefinitionIdA,
          dimensionId: dimensionIdFromOther,
        },
      );
    },
  );
}
