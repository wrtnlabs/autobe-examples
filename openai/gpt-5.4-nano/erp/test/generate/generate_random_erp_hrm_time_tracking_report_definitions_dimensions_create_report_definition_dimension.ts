import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";

export async function generate_random_erp_hrm_time_tracking_report_definitions_dimensions_create_report_definition_dimension(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IErpHrmTimeTrackingReportDefinitionDimension.ICreate>
      | undefined;
    params: {
      reportDefinitionId: string;
    };
  },
): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
  const prepared: IErpHrmTimeTrackingReportDefinitionDimension.ICreate =
    prepare_random_erp_hrm_time_tracking_report_definition_dimension(
      props.body,
    );
  const result: IErpHrmTimeTrackingReportDefinitionDimension =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.createReportDefinitionDimension(
      connection,
      {
        body: prepared,
        reportDefinitionId: props.params.reportDefinitionId as string &
          tags.Format<"uuid">,
      },
    );
  return result;
}
