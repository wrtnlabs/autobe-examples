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

export async function putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensionsDimensionId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  dimensionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionDimension.IUpdate;
}): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
  const now = toISOStringSafe(new Date());
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: { id: true, erp_hrm_time_tracking_organization_id: true },
      },
    );
  void reportDefinition;
  const dimension =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findUniqueOrThrow(
      {
        where: { id: props.dimensionId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_definition_id: true,
          dimension_key: true,
          deleted_at: true,
        },
      },
    );
  if (
    dimension.erp_hrm_time_tracking_report_definition_id !==
    props.reportDefinitionId
  ) {
    throw new HttpException("Dimension not linked to report definition", 400);
  }
  const nextDimensionKey =
    props.body.dimension_key !== undefined
      ? props.body.dimension_key
      : dimension.dimension_key;
  if (props.body.sort_order !== undefined && props.body.sort_order < 1) {
    throw new HttpException("sort_order must be >= 1", 400);
  }
  const nextDeletedAt =
    props.body.deleted_at !== undefined
      ? props.body.deleted_at === null
        ? null
        : now
      : dimension.deleted_at;
  if (props.body.dimension_key !== undefined) {
    const conflict =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findFirst(
        {
          where: {
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
            dimension_key: nextDimensionKey,
            deleted_at: null,
            id: { not: props.dimensionId },
          },
          select: { id: true },
        },
      );
    if (conflict) throw new HttpException("dimension_key already exists", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_report_definition_dimensions.update({
      where: { id: props.dimensionId },
      data: {
        ...(props.body.dimension_key !== undefined && {
          dimension_key: props.body.dimension_key,
        }),
        ...(props.body.dimension_label !== undefined && {
          dimension_label: props.body.dimension_label,
        }),
        ...(props.body.sort_order !== undefined && {
          sort_order: props.body.sort_order,
        }),
        ...(props.body.deleted_at !== undefined && {
          deleted_at: nextDeletedAt === null ? null : new Date(nextDeletedAt),
        }),
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findUniqueOrThrow(
      {
        where: { id: props.dimensionId },
        ...ErpHrmTimeTrackingReportDefinitionDimensionTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportDefinitionDimensionTransformer.transform(
    updated,
  );
}
