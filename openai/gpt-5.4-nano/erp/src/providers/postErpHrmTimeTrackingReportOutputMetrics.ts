import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingReportOutputMetrics(props: {
  body: IErpHrmTimeTrackingReportOutputMetric.ICreate;
}): Promise<IErpHrmTimeTrackingReportOutputMetric> {
  const parent =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow(
      {
        where: { id: props.body.erp_hrm_time_tracking_report_output_id },
        select: { id: true, deleted_at: true },
      },
    );
  if (parent.deleted_at !== null) {
    throw new HttpException("Report output is not available", 404);
  }
  try {
    const created =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.create({
        data: {
          id: v4(),
          erp_hrm_time_tracking_report_output_id:
            props.body.erp_hrm_time_tracking_report_output_id,
          metric_name: props.body.metric_name,
          metric_value: props.body.metric_value,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
        select: {
          id: true,
          erp_hrm_time_tracking_report_output_id: true,
          metric_name: true,
          metric_value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    return {
      id: created.id,
      erp_hrm_time_tracking_report_output_id:
        created.erp_hrm_time_tracking_report_output_id,
      metric_name: created.metric_name,
      metric_value: created.metric_value,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      deleted_at: created.deleted_at ? created.deleted_at.toISOString() : null,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "23505"
    ) {
      throw new HttpException(
        `metric_name already exists for this report output`,
        409,
      );
    }
    throw e;
  }
}
