import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  filterId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionFilter.IUpdate;
}): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
          report_type: true,
          deleted_at: true,
        },
      },
    );
  if (reportDefinition.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const existingFilter =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.findUniqueOrThrow(
      {
        where: { id: props.filterId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_definition_id: true,
          field_key: true,
          operator: true,
          value_text: true,
          value_text_2: true,
          is_enabled: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (existingFilter.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    existingFilter.erp_hrm_time_tracking_report_definition_id !==
    props.reportDefinitionId
  ) {
    throw new HttpException("Not Found", 404);
  }
  const nextFieldKey: string = props.body.field_key ?? existingFilter.field_key;
  const nextOperator: string = props.body.operator ?? existingFilter.operator;
  const nextValueText: string =
    props.body.value_text ?? existingFilter.value_text;
  const nextValueText2: string | null =
    props.body.value_text_2 === undefined
      ? existingFilter.value_text_2
      : props.body.value_text_2;
  const nextIsEnabled: boolean =
    props.body.is_enabled ?? existingFilter.is_enabled;
  // Business validation for meaningful configuration.
  if (nextFieldKey.trim().length === 0) {
    throw new HttpException("Invalid filter field_key", 400);
  }
  if (nextOperator.trim().length === 0) {
    throw new HttpException("Invalid filter operator", 400);
  }
  if (nextValueText.trim().length === 0) {
    throw new HttpException("Invalid filter value_text", 400);
  }
  const op = nextOperator.toLowerCase();
  const expectsSecondary =
    op.includes("between") ||
    op.includes("range") ||
    op.includes("_between") ||
    op.includes("_range");
  if (expectsSecondary) {
    if (nextValueText2 === null || nextValueText2.trim().length === 0) {
      throw new HttpException(
        "value_text_2 is required for the selected operator",
        400,
      );
    }
  }
  // Note: report_type compatibility is domain-specific. We ensure configuration is at least syntactically
  // compatible here. Deeper validation is expected to be centralized in report generation logic.
  // Since we must not guess semantics without available shared logic, we only validate operator/value shape.
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.update(
      {
        where: { id: props.filterId },
        data: {
          field_key: nextFieldKey,
          operator: nextOperator,
          value_text: nextValueText,
          value_text_2: nextValueText2,
          is_enabled: nextIsEnabled,
          updated_at: new Date(),
          // deleted_at intentionally not modified
        },
      },
    );
  return {
    id: updated.id,
    reportDefinitionId: updated.erp_hrm_time_tracking_report_definition_id,
    fieldKey: updated.field_key,
    operator: updated.operator,
    valueText: updated.value_text,
    valueText2: updated.value_text_2,
    isEnabled: updated.is_enabled,
    displayOrder: updated.display_order,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
    deletedAt: updated.deleted_at?.toISOString() ?? null,
  };
}
