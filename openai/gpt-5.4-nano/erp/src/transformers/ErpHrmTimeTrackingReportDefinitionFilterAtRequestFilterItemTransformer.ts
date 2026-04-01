import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionFilterAtRequestFilterItemTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definition_filtersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        field_key: true,
        operator: true,
        value_text: true,
        value_text_2: true,
        is_enabled: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reportDefinition: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_filtersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinitionFilter.IRequestFilterItem> {
    return {
      fieldKey: null,
      operator: null,
      valueText: null,
      valueText2: null,
      isEnabled: null,
    };
  }
}
