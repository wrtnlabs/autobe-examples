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
  typia.assert(props.reportOutputMetricId);
  const metric =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findUnique(
      {
        where: { id: props.reportOutputMetricId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_output_id: true,
          reportOutput: {
            select: {
              id: true,
              reportGenerationRun: {
                select: {
                  id: true,
                  reportDefinition: {
                    select: {
                      id: true,
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
  if (!metric) {
    throw new HttpException("Not Found", 404);
  }
  // Organization context & authorization must be resolved from runtime auth; placeholder
  // If mismatch, block as not-found.
  const selectedOrganizationId = (globalThis as any)?.selectedOrganizationId as
    | string
    | undefined;
  if (!selectedOrganizationId) {
    throw new HttpException("Organization context is required", 400);
  }
  if (
    metric.reportOutput.reportGenerationRun.reportDefinition
      .erp_hrm_time_tracking_organization_id !== selectedOrganizationId
  ) {
    throw new HttpException("Not Found", 404);
  }
  // Authorization placeholder
  const canManage = true;
  if (!canManage) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.delete({
    where: { id: props.reportOutputMetricId },
  });
}
