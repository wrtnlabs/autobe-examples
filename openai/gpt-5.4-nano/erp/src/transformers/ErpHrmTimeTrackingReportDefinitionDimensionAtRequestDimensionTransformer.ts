import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingReportDefinitionDimensionAtRequestDimensionTransformer {
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
        reportDefinition: true,
        reportOutputs: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_report_definition_dimensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension> {
    return {
      dimension_key: Boolean(input.dimension_key),
      dimension_label: Boolean(input.dimension_label),
      sort_order: input.sort_order !== 0,
    };
  }
}
