import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionFilterCollector } from "../collectors/ErpHrmTimeTrackingReportDefinitionFilterCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFilters(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
}): Promise<void> {
  await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
    {
      where: { id: props.reportDefinitionId },
      select: { id: true },
    },
  );
  if (props.body.field_key.trim().length === 0) {
    throw new HttpException("field_key must not be empty", 400);
  }
  if (props.body.operator.trim().length === 0) {
    throw new HttpException("operator must not be empty", 400);
  }
  if (props.body.value_text.trim().length === 0) {
    throw new HttpException("value_text must not be empty", 400);
  }
  if (props.body.value_text_2 === undefined) {
    throw new HttpException(
      "value_text_2 must be provided as null when not applicable",
      400,
    );
  }
  const displayOrder = props.body.display_order;
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    throw new HttpException(
      "display_order must be a non-negative integer",
      400,
    );
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.create({
    data: await ErpHrmTimeTrackingReportDefinitionFilterCollector.collect({
      body: props.body,
      reportDefinition: { id: props.reportDefinitionId } satisfies IEntity,
    }),
  });
}
