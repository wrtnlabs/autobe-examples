import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionDimension.IRequest;
}): Promise<IErpHrmTimeTrackingReportDefinitionDimension.ISummary> {
  const seen = new Set<string>();
  for (const dimension of props.body.dimensions) {
    const dimensionKey = dimension.dimension_key as unknown as string;
    if (seen.has(dimensionKey)) {
      throw new HttpException("Duplicate dimension_key in request", 400);
    }
    seen.add(dimensionKey);
  }
  const now = toISOStringSafe("now");
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
    throw new HttpException("Report definition is deleted", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existingActive =
      await tx.erp_hrm_time_tracking_report_definition_dimensions.findMany({
        where: {
          erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
          deleted_at: null,
        },
        select: { id: true, dimension_key: true },
      });
    const requestedKeys = new Set<string>(
      props.body.dimensions.map((d) => d.dimension_key as unknown as string),
    );
    for (const dimension of props.body.dimensions) {
      const dimensionKey = dimension.dimension_key as unknown as string;
      const dimensionLabel = dimension.dimension_label as unknown as string;
      const sortOrder = dimension.sort_order as unknown as number;
      const existingRow =
        await tx.erp_hrm_time_tracking_report_definition_dimensions.findFirst({
          where: {
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
            dimension_key: dimensionKey as any,
          },
        });
      if (existingRow) {
        await tx.erp_hrm_time_tracking_report_definition_dimensions.update({
          where: { id: existingRow.id },
          data: {
            dimension_label: dimensionLabel as any,
            sort_order: sortOrder as any,
            updated_at: now,
            deleted_at: null,
          },
        });
      } else {
        await tx.erp_hrm_time_tracking_report_definition_dimensions.create({
          data: {
            id: v4() as unknown as string & tags.Format<"uuid">,
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
            dimension_key: dimensionKey as any,
            dimension_label: dimensionLabel as any,
            sort_order: sortOrder as any,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
    }
    for (const row of existingActive) {
      const rowKey = row.dimension_key as unknown as string;
      if (!requestedKeys.has(rowKey)) {
        await tx.erp_hrm_time_tracking_report_definition_dimensions.update({
          where: { id: row.id },
          data: {
            deleted_at: now,
            updated_at: now,
          },
        });
      }
    }
  });
  const active =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findMany(
      {
        where: {
          erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
          deleted_at: null,
        },
        orderBy: { sort_order: "asc" },
        ...ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer.select(),
      },
    );
  if (active.length === 0) {
    throw new HttpException("No active dimensions after update", 404);
  }
  const transformed = await ArrayUtil.asyncMap(
    active,
    ErpHrmTimeTrackingReportDefinitionDimensionAtSummaryTransformer.transform,
  );
  return transformed[0];
}
