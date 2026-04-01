import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportOutputMetricTransformer } from "../transformers/ErpHrmTimeTrackingReportOutputMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportOutputMetricsReportOutputMetricId(props: {
  reportOutputMetricId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportOutputMetric> {
  // Placeholder implementation
  return await ErpHrmTimeTrackingReportOutputMetricTransformer.transform(
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findFirstOrThrow(
      {
        where: {
          id: props.reportOutputMetricId,
          deleted_at: null,
        },
        ...ErpHrmTimeTrackingReportOutputMetricTransformer.select(),
      },
    ),
  );
}
