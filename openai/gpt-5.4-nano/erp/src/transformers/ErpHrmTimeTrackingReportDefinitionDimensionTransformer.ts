import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionDimensionTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_report_definition_dimensionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_report_definition_id: true,
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
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
    return {
      id: input.id,
      reportDefinitionId: input.erp_hrm_time_tracking_report_definition_id,
      dimensionKey: input.dimension_key,
      dimensionLabel: input.dimension_label,
      sortOrder: input.sort_order,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
