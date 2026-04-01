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
  const existingDimension =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findUniqueOrThrow(
      {
        where: { id: props.dimensionId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_definition_id: true,
          dimension_key: true,
          dimension_label: true,
          sort_order: true,
          deleted_at: true,
          updated_at: true,
        },
      },
    );
  if (
    existingDimension.erp_hrm_time_tracking_report_definition_id !==
    props.reportDefinitionId
  ) {
    throw new HttpException(
      "Dimension does not belong to report definition",
      400,
    );
  }
  if (props.body.sort_order !== undefined && props.body.sort_order < 1) {
    throw new HttpException("sort_order must be >= 1", 400);
  }
  const nextDimensionKey =
    props.body.dimension_key ?? existingDimension.dimension_key;
  const shouldCheckDimensionKeyUniqueness =
    props.body.dimension_key !== undefined &&
    nextDimensionKey !== existingDimension.dimension_key;
  if (shouldCheckDimensionKeyUniqueness) {
    const duplicate =
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
    if (duplicate) {
      throw new HttpException(
        "dimension_key already exists in this report definition",
        409,
      );
    }
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.update(
    {
      where: { id: props.dimensionId },
      data: {
        ...(props.body.dimension_key !== undefined && {
          dimension_key: props.body.dimension_key,
        }),
        ...(props.body.dimension_label !== undefined && {
          dimension_label: props.body.dimension_label,
        }),
        ...(props.body.sort_order !== undefined && {
          sort_order: props.body.sort_order as number,
        }),
        ...(props.body.deleted_at !== undefined && {
          deleted_at: props.body.deleted_at,
        }),
        updated_at: existingDimension.updated_at,
      },
    },
  );
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findUniqueOrThrow(
      {
        where: { id: props.dimensionId },
        ...ErpHrmTimeTrackingReportDefinitionDimensionTransformer.select(),
      },
    );
  return ErpHrmTimeTrackingReportDefinitionDimensionTransformer.transform(
    updated,
  );
}
