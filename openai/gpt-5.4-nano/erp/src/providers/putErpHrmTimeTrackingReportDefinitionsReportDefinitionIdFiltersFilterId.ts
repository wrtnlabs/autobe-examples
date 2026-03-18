import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportDefinitionFilterTransformer } from "../transformers/ErpHrmTimeTrackingReportDefinitionFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeTrackingReportDefinitionsReportDefinitionIdFiltersFilterId(props: {
  reportDefinitionId: string & tags.Format<"uuid">;
  filterId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportDefinitionFilter.IUpdate;
}): Promise<IErpHrmTimeTrackingReportDefinitionFilter> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow({
      where: { id: props.reportDefinitionId },
      select: { id: true },
    });
    const existing =
      await prisma.erp_hrm_time_tracking_report_definition_filters.findFirstOrThrow(
        {
          where: {
            id: props.filterId,
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
          },
          ...ErpHrmTimeTrackingReportDefinitionFilterTransformer.select(),
        },
      );
    const nextFieldKey = props.body.field_key ?? existing.field_key;
    const nextOperator = props.body.operator ?? existing.operator;
    const nextValueText = props.body.value_text ?? existing.value_text;
    const nextValueText2 =
      props.body.value_text_2 === undefined
        ? existing.value_text_2
        : props.body.value_text_2;
    const nextIsEnabled = props.body.is_enabled ?? existing.is_enabled;
    if (nextFieldKey === undefined || nextFieldKey === "") {
      throw new HttpException("field_key is required", 400);
    }
    if (nextOperator === undefined || nextOperator === "") {
      throw new HttpException("operator is required", 400);
    }
    if (nextValueText === undefined || nextValueText === "") {
      throw new HttpException("value_text is required", 400);
    }
    const op = nextOperator.toLowerCase();
    const requiresSecondValue = op.includes("between") || op.includes("range");
    if (requiresSecondValue) {
      if (
        nextValueText2 === null ||
        nextValueText2 === undefined ||
        nextValueText2 === ""
      ) {
        throw new HttpException(
          "value_text_2 is required for between/range operators",
          400,
        );
      }
    }
    await prisma.erp_hrm_time_tracking_report_definition_filters.update({
      where: { id: props.filterId },
      data: {
        ...(props.body.field_key !== undefined && {
          field_key: props.body.field_key,
        }),
        ...(props.body.operator !== undefined && {
          operator: props.body.operator,
        }),
        ...(props.body.value_text !== undefined && {
          value_text: props.body.value_text,
        }),
        ...(props.body.value_text_2 !== undefined && {
          value_text_2: props.body.value_text_2,
        }),
        ...(props.body.is_enabled !== undefined && {
          is_enabled: nextIsEnabled,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    const updated =
      await prisma.erp_hrm_time_tracking_report_definition_filters.findFirstOrThrow(
        {
          where: {
            id: props.filterId,
            erp_hrm_time_tracking_report_definition_id:
              props.reportDefinitionId,
          },
          ...ErpHrmTimeTrackingReportDefinitionFilterTransformer.select(),
        },
      );
    return await ErpHrmTimeTrackingReportDefinitionFilterTransformer.transform(
      updated,
    );
  });
}
