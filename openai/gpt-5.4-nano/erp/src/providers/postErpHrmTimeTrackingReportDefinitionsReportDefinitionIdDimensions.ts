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

export async function postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdDimensions(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
}): Promise<IErpHrmTimeTrackingReportDefinitionDimension> {
  // Body validations (business validation only)
  if (props.body.dimension_key.trim().length === 0) {
    throw new HttpException("dimension_key must be a non-empty string", 400);
  }
  if (props.body.dimension_label.trim().length === 0) {
    throw new HttpException("dimension_label must be a non-empty string", 400);
  }
  if (!Number.isInteger(props.body.sort_order) || props.body.sort_order < 1) {
    throw new HttpException("sort_order must be an integer >= 1", 400);
  }
  // Resolve selected organization context. Existing auth layer is expected to attach it.
  const organizationId: (string & tags.Format<"uuid">) | undefined = (
    props as unknown as {
      organization_id?: string & tags.Format<"uuid">;
    }
  ).organization_id;
  if (!organizationId) {
    throw new HttpException(
      "Please select an organization context before accessing reports.",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const parent = await tx.erp_hrm_time_tracking_report_definitions.findFirst({
      where: {
        id: props.reportDefinitionId,
        erp_hrm_time_tracking_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        is_active: true,
      },
    });
    if (!parent) {
      throw new HttpException("Report definition not found", 404);
    }
    if (!parent.is_active) {
      throw new HttpException("Report definition is not active", 403);
    }
    const existingByKey =
      await tx.erp_hrm_time_tracking_report_definition_dimensions.findFirst({
        where: {
          erp_hrm_time_tracking_report_definition_id: parent.id,
          dimension_key: props.body.dimension_key,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingByKey) {
      throw new HttpException(
        "dimension_key already exists for this report definition",
        409,
      );
    }
    const existingBySort =
      await tx.erp_hrm_time_tracking_report_definition_dimensions.findFirst({
        where: {
          erp_hrm_time_tracking_report_definition_id: parent.id,
          sort_order: props.body.sort_order,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingBySort) {
      throw new HttpException(
        "sort_order already exists for this report definition",
        409,
      );
    }
    const nowIso = toISOStringSafe(new Date());
    const created =
      await tx.erp_hrm_time_tracking_report_definition_dimensions.create({
        data: {
          id: typia.assert<string & tags.Format<"uuid">>(v4()),
          erp_hrm_time_tracking_report_definition_id: props.reportDefinitionId,
          dimension_key: props.body.dimension_key,
          dimension_label: props.body.dimension_label,
          sort_order: props.body.sort_order,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        },
      });
    return await ErpHrmTimeTrackingReportDefinitionDimensionTransformer.transform(
      created,
    );
  });
}
