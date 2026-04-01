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

export async function postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
}): Promise<void> {
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: { id: props.reportDefinitionId },
        select: {
          id: true,
          erp_hrm_time_tracking_organization_id: true,
        },
      },
    );
  if (props.body.field_key.trim().length === 0) {
    throw new HttpException("field_key must be non-empty", 400);
  }
  if (props.body.operator.trim().length === 0) {
    throw new HttpException("operator must be non-empty", 400);
  }
  if (props.body.value_text.trim().length === 0) {
    throw new HttpException("value_text must be non-empty", 400);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.create({
    data: {
      id: v4(),
      field_key: props.body.field_key,
      operator: props.body.operator,
      value_text: props.body.value_text,
      value_text_2: props.body.value_text_2,
      is_enabled: props.body.is_enabled,
      display_order: props.body.display_order,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      reportDefinition: { connect: { id: reportDefinition.id } },
    },
  });
}
