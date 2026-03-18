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
  const body = props.body;
  await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow({
    where: { id: body.erp_hrm_time_tracking_report_output_id },
    select: { id: true, deleted_at: true },
  });
  try {
    const created =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          metric_name: body.metric_name,
          metric_value: body.metric_value,
          deleted_at: null,
          created_at: new Date(),
          updated_at: new Date(),
          reportOutput: {
            connect: { id: body.erp_hrm_time_tracking_report_output_id },
          },
        } satisfies Prisma.erp_hrm_time_tracking_report_output_metricsCreateInput,
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
      created_at: toISOStringSafe(created.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(created.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        created.deleted_at === null
          ? null
          : (toISOStringSafe(created.deleted_at) as string &
              tags.Format<"date-time">),
    } satisfies IErpHrmTimeTrackingReportOutputMetric;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "metric_name already exists for the given report output",
          400,
        );
      }
    }
    throw error;
  }
}
