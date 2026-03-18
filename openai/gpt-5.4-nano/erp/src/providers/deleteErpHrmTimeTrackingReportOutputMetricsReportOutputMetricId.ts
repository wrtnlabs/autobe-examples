import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmTimeTrackingReportOutputMetricsReportOutputMetricId(props: {
  reportOutputMetricId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findFirstOrThrow(
    {
      where: { id: props.reportOutputMetricId },
      select: {
        id: true,
        erp_hrm_time_tracking_report_output_id: true,
      },
    },
  );
  await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.delete({
    where: { id: props.reportOutputMetricId },
  });
}
