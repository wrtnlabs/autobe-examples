import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportDefinitionDimensionCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
    reportDefinition: IEntity;
  }) {
    return {
      id: v4(),
      dimension_key: props.body.dimension_key,
      dimension_label: props.body.dimension_label,
      sort_order: props.body.sort_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reportDefinition: {
        connect: { id: props.reportDefinition.id },
      },
      // reportOutputs is a reverse hasMany relation; omit from create input.
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_dimensionsCreateInput;
  }
}
