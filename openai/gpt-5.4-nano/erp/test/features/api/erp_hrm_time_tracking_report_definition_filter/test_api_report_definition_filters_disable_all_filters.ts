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

export async function test_api_report_definition_filters_disable_all_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create report definition with configured filters (use generator defaults)
  const userConnection: api.IConnection = { host: connection.host };
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      userConnection,
      {},
    );
  typia.assert(reportDefinition);
  // 2) Disable all filters by providing empty authoritative filter set
  const patchBody = {
    filters: [],
    page: null,
    limit: null,
  } satisfies IErpHrmTimeTrackingReportDefinitionFilter.IRequest;
  const updatedFilters =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.updateFilters(
      userConnection,
      {
        reportDefinitionId: reportDefinition.id,
        body: patchBody,
      },
    );
  typia.assert(updatedFilters);
  // 3) Validate: response contains no active filter items
  const length = typia.assert<{
    items: unknown[];
  }>(updatedFilters).items.length;
  TestValidator.equals(
    "updated filters length should be 0 when disabling all filters",
    length,
    0,
  );
}
