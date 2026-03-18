import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingReportDefinitionFilterCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
    reportDefinition: IEntity;
  }) {
    return {
      id: v4(),
      field_key: props.body.field_key,
      operator: props.body.operator,
      value_text: props.body.value_text,
      value_text_2: props.body.value_text_2,
      is_enabled: props.body.is_enabled,
      display_order: props.body.display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      reportDefinition: { connect: { id: props.reportDefinition.id } },
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_filtersCreateInput;
  }
}
