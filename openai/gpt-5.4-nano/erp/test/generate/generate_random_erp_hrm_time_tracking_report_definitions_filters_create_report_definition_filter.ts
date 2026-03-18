import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingReportDefinitionFilter.ICreate>
      | undefined;
    params: {
      reportDefinitionId: string;
    };
  },
): Promise<void> {
  const prepared: IErpHrmTimeTrackingReportDefinitionFilter.ICreate =
    prepare_random_erp_hrm_time_tracking_report_definition_filter(props.body);
  return await api.functional.erpHrmTimeTracking.reportDefinitions.filters.createReportDefinitionFilter(
    connection,
    {
      body: prepared,
      reportDefinitionId: props.params.reportDefinitionId,
    },
  );
}
