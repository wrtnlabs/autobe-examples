import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  dimensionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
          deleted_at: true,
        },
      },
    );
  if (reportDefinition.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const dimension =
      await tx.erp_hrm_time_tracking_report_definition_dimensions.findFirstOrThrow(
        {
          where: {
            id: props.dimensionId,
            erp_hrm_time_tracking_report_definition_id: reportDefinition.id,
          },
          select: { id: true, deleted_at: true },
        },
      );
    if (dimension.deleted_at !== null) {
      return;
    }
    await tx.erp_hrm_time_tracking_report_definition_dimensions.update({
      where: { id: dimension.id },
      data: { deleted_at: new Date() },
      select: { id: true },
    });
  });
}
