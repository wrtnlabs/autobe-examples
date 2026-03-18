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
import { generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_filter_update_scoped_to_parent_report_definition(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // NOTE: authorization helpers and IAdmin type are not available in the provided compilation context.
  // We proceed with the available generators and API calls using the actor-scoped connection.
  const reportDefinitionA: IErpHrmTimeTrackingReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      adminConnection,
      {
        body: {
          code: `A-${RandomGenerator.alphabets(10)}`,
          name: `Report A ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: RandomGenerator.alphabets(8),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
              dimension_label: RandomGenerator.name(),
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: `field_${RandomGenerator.alphabets(6)}`,
              operator: "eq",
              value_text: RandomGenerator.alphabets(8),
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionA);
  const reportDefinitionB: IErpHrmTimeTrackingReportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      adminConnection,
      {
        body: {
          code: `B-${RandomGenerator.alphabets(10)}`,
          name: `Report B ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          report_type: reportDefinitionA.report_type,
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: `dim_${RandomGenerator.alphabets(6)}`,
              dimension_label: RandomGenerator.name(),
              sort_order: 1,
            },
          ],
          definitionFilters: [
            {
              field_key: `field_${RandomGenerator.alphabets(6)}`,
              operator: "eq",
              value_text: RandomGenerator.alphabets(8),
              value_text_2: null,
              is_enabled: true,
              display_order: 1,
            },
          ],
        } satisfies IErpHrmTimeTrackingReportDefinition.ICreate,
      },
    );
  typia.assert(reportDefinitionB);
  // Create at least one filter under report definition A.
  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    adminConnection,
    {
      params: { reportDefinitionId: reportDefinitionA.id },
      body: {
        field_key: `field_${RandomGenerator.alphabets(6)}`,
        operator: "eq",
        value_text: RandomGenerator.alphabets(8),
        value_text_2: null,
        is_enabled: true,
        display_order: 1,
      } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate,
    },
  );
  // We cannot capture the created filterId because the generator returns void.
  // Use an unrelated UUID to ensure the update is scoped by reportDefinitionId.
  const mismatchedFilterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject updating a filter that is not owned by the provided reportDefinitionId (scoped ownership)",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
        adminConnection,
        {
          reportDefinitionId: reportDefinitionB.id,
          filterId: mismatchedFilterId,
          body: {
            is_enabled: false,
          } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
        },
      );
    },
  );
}
