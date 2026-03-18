import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_definition_update_success_change_fields(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const reportDefinitionBefore =
    await api.functional.erpHrmTimeTracking.reportDefinitions.update(
      actorConnection,
      {
        reportDefinitionId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IErpHrmTimeTrackingReportDefinition.IUpdate>(),
      },
    );
  typia.assert(reportDefinitionBefore);
  const updatedCode = `code_${RandomGenerator.alphabets(10)}`;
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReportType = reportDefinitionBefore.report_type;
  const updatedIsActive = !reportDefinitionBefore.is_active;
  const updatedAtBefore = reportDefinitionBefore.updated_at;
  const reportDefinitionAfter =
    await api.functional.erpHrmTimeTracking.reportDefinitions.update(
      actorConnection,
      {
        reportDefinitionId: reportDefinitionBefore.id,
        body: {
          code: updatedCode,
          name: updatedName,
          description: updatedDescription,
          report_type: updatedReportType,
          is_active: updatedIsActive,
        } satisfies IErpHrmTimeTrackingReportDefinition.IUpdate,
      },
    );
  typia.assert(reportDefinitionAfter);
  TestValidator.equals(
    "report definition id should match",
    reportDefinitionAfter.id,
    reportDefinitionBefore.id,
  );
  TestValidator.equals(
    "organization_id should remain unchanged",
    reportDefinitionAfter.organization_id,
    reportDefinitionBefore.organization_id,
  );
  TestValidator.equals(
    "code should be updated",
    reportDefinitionAfter.code,
    updatedCode,
  );
  TestValidator.equals(
    "name should be updated",
    reportDefinitionAfter.name,
    updatedName,
  );
  TestValidator.equals(
    "description should be updated",
    reportDefinitionAfter.description,
    updatedDescription,
  );
  TestValidator.equals(
    "report_type should be updated",
    reportDefinitionAfter.report_type,
    updatedReportType,
  );
  TestValidator.equals(
    "is_active should be toggled",
    reportDefinitionAfter.is_active,
    updatedIsActive,
  );
  TestValidator.predicate(
    "updated_at should be later",
    new Date(reportDefinitionAfter.updated_at).getTime() >
      new Date(updatedAtBefore).getTime(),
  );
  TestValidator.predicate(
    "dimensions should remain present",
    reportDefinitionAfter.dimensions !== false,
  );
  TestValidator.predicate(
    "filters should remain present",
    reportDefinitionAfter.filters !== false,
  );
}
