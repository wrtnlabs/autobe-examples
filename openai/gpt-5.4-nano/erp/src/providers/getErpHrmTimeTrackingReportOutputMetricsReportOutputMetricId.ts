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
  const metric =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findUniqueOrThrow(
      {
        where: { id: props.reportOutputMetricId },
        select: {
          ...ErpHrmTimeTrackingReportOutputMetricTransformer.select().select,
          reportOutput: {
            select: {
              reportGenerationRun: {
                select: {
                  reportDefinition: {
                    select: {
                      erp_hrm_time_tracking_organization_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    );
  return await ErpHrmTimeTrackingReportOutputMetricTransformer.transform(
    metric,
  );
}
