import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionFilterTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definition_filtersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_report_definition_id: true,
        field_key: true,
        operator: true,
        value_text: true,
        value_text_2: true,
        is_enabled: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_filtersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
    return {
      id: input.id,
      reportDefinitionId: input.erp_hrm_time_tracking_report_definition_id,
      fieldKey: input.field_key,
      operator: input.operator,
      valueText: input.value_text,
      valueText2: input.value_text_2,
      isEnabled: input.is_enabled,
      displayOrder: input.display_order,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
