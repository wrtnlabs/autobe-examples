import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_filter_read_disabled_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member and create a report definition with a disabled filter
  const userConnection: api.IConnection = { host: connection.host };
  const fieldKey = "employee";
  const operator = "eq";
  const valueText = RandomGenerator.alphabets(12);
  const valueText2: string | null = null;
  const displayOrder = 1;
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {
        body: {
          code: `rpt_${RandomGenerator.alphaNumeric(10)}`,
          name: RandomGenerator.name(),
          description: null,
          report_type: "time_tracking",
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "employee",
              dimension_label: "Employee",
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: fieldKey,
              operator,
              value_text: valueText,
              value_text_2: valueText2,
              is_enabled: false,
              display_order: displayOrder,
            },
          ],
        },
      },
    );
  typia.assert(reportDefinition);
  const filterId = typia.assert(
    (
      reportDefinition as unknown as {
        filters: Array<{
          id: string;
        }>;
      }
    ).filters[0].id,
  );
  // 2) Read disabled filter configuration
  const filter =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.at(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        filterId,
      },
    );
  typia.assert(filter);
  // 3-4) Validate disabled status and persisted configuration
  TestValidator.equals("filter isEnabled false", filter.isEnabled, false);
  TestValidator.equals("filter deletedAt null", filter.deletedAt, null);
  TestValidator.equals(
    "filter displayOrder",
    filter.displayOrder,
    displayOrder,
  );
  TestValidator.equals("filter fieldKey", filter.fieldKey, fieldKey);
  TestValidator.equals("filter operator", filter.operator, operator);
  TestValidator.equals("filter valueText", filter.valueText, valueText);
  TestValidator.equals("filter valueText2", filter.valueText2, valueText2);
}
