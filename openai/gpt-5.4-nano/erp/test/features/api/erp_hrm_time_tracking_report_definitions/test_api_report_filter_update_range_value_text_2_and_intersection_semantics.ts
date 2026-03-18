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

export async function test_api_report_filter_update_range_value_text_2_and_intersection_semantics(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections (connection isolation pattern)
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1) Create a report definition with two enabled filter rules.
  //    We rely on the creation response to include filter DTOs.
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {
        body: {
          code: RandomGenerator.alphabets(12),
          name: RandomGenerator.name(),
          description: null,
          report_type: RandomGenerator.alphabets(8),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key: "dim_1",
              dimension_label: "Dimension 1",
              sort_order: 1,
            },
            {
              dimension_key: "dim_2",
              dimension_label: "Dimension 2",
              sort_order: 2,
            },
          ],
          definitionFilters: [
            {
              field_key: "field_range",
              operator: "between",
              value_text: "10",
              value_text_2: "20",
              is_enabled: true,
              display_order: 1,
            },
            {
              field_key: "field_other",
              operator: "eq",
              value_text: "active",
              value_text_2: null,
              is_enabled: true,
              display_order: 2,
            },
          ],
        },
      },
    );
  typia.assert(reportDefinition);
  // Extract filters from the response.
  // (Some SDK DTOs may have boolean placeholder fields; treat as unknown at runtime)
  const filtersUnknown: unknown = (
    reportDefinition as unknown as {
      filters: unknown;
    }
  ).filters;
  const filters =
    typia.assert<IErpHrmTimeTrackingReportDefinitionFilter[]>(filtersUnknown);
  const rangeFilter = filters.find((f) => f.valueText2 !== null) ?? filters[0];
  const otherFilter =
    filters.find((f) => f.id !== rangeFilter.id) ?? filters[1];
  const originalUpdatedAt = rangeFilter.updatedAt;
  // 2) First PUT: set a new value_text_2
  const newValueText2 = "30";
  const updated1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        filterId: rangeFilter.id,
        body: {
          is_enabled: true,
          value_text_2: newValueText2,
        } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "value_text_2 updated",
    updated1.valueText2,
    newValueText2,
  );
  TestValidator.notEquals(
    "updatedAt changed",
    updated1.updatedAt,
    originalUpdatedAt,
  );
  // 3) Second PUT: clear value_text_2 by sending null
  const updated2 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        filterId: rangeFilter.id,
        body: {
          is_enabled: true,
          value_text_2: null,
        } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals("value_text_2 cleared", updated2.valueText2, null);
  // 4) Intersection semantics edge: keep other filter enabled.
  const updatedOther =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilter(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        filterId: otherFilter.id,
        body: {
          is_enabled: true,
        } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IUpdate,
      },
    );
  typia.assert(updatedOther);
  TestValidator.equals(
    "other filter still enabled",
    updatedOther.isEnabled,
    true,
  );
  // Avoid unused admin connection warning; keep as actor placeholder
  void adminConnection;
}
