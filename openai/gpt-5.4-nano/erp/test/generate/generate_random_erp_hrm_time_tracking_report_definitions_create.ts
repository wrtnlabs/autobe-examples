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

import { prepare_random_erp_hrm_time_tracking_report_definition } from "../prepare/prepare_random_erp_hrm_time_tracking_report_definition";

export async function generate_random_erp_hrm_time_tracking_report_definitions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingReportDefinition.ICreate> | undefined;
  },
): Promise<IErpHrmTimeTrackingReportDefinition> {
  const prepared: IErpHrmTimeTrackingReportDefinition.ICreate =
    prepare_random_erp_hrm_time_tracking_report_definition(props.body);
  const result: IErpHrmTimeTrackingReportDefinition =
    await api.functional.erpHrmTimeTracking.reportDefinitions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
