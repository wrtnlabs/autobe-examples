import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definition_dimensionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        dimension_key: true,
        dimension_label: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reportDefinition: {
          select: {
            id: true,
          },
        },
        reportOutputs: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_dimensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension.ISummary> {
    return {
      id: input.id,
      dimension_key: input.dimension_key,
      dimension_label: input.dimension_label,
      sort_order: input.sort_order,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
