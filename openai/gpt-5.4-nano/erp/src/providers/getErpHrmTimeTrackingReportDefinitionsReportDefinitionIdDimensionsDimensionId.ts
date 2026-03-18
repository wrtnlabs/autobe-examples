import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionDimensionTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionDimensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  dimensionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: { id: true },
      },
    );
  const dimension =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findUniqueOrThrow(
      {
        where: { id: props.dimensionId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_definition_id: true,
          dimension_key: true,
          dimension_label: true,
          sort_order: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (
    dimension.erp_hrm_time_tracking_report_definition_id !== reportDefinition.id
  ) {
    throw new HttpException("Not Found", 404);
  }
  return await ErpHrmTimeTrackingReportDefinitionDimensionTransformer.transform(
    dimension,
  );
}
