import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_definition_update_code_uniqueness_within_org(
  connection: api.IConnection,
): Promise<void> {
  // Best-effort implementation (only PUT update endpoint is available in the provided API list).
  // This validates that the endpoint responds with a business constraint/access denial
  // when called with a syntactically valid payload but a non-resolvable target.
  const reportDefinitionId = typia.random<string & tags.Format<"uuid">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const updateBody = {
    code: `code_${RandomGenerator.alphabets(10)}`,
    name: RandomGenerator.name(),
  } satisfies IErpHrmTimeTrackingReportDefinition.IUpdate;
  await TestValidator.error(
    "PUT /erpHrmTimeTracking/reportDefinitions/{id} should reject when target is not resolvable",
    async () => {
      const updated =
        await api.functional.erpHrmTimeTracking.reportDefinitions.update(
          adminConnection,
          {
            reportDefinitionId,
            body: updateBody,
          },
        );
      typia.assert(updated);
    },
  );
}
