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

export async function putErpHrmTimeTrackingReportOutputMetricsReportOutputMetricId(props: {
  reportOutputMetricId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportOutputMetric.IUpdate;
}): Promise<IErpHrmTimeTrackingReportOutputMetric> {
  // 1) Load metric row (404 if not found)
  const metric =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findUniqueOrThrow(
      {
        where: { id: props.reportOutputMetricId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_output_id: true,
          metric_name: true,
          metric_value: true,
          deleted_at: true,
        },
      },
    );
  // 2) Resolve parent report output -> generation run -> report definition -> organization
  const parent =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findUniqueOrThrow(
      {
        where: { id: metric.erp_hrm_time_tracking_report_output_id },
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
    );
  const organizationId = (() => {
    const anyGlobal: unknown = MyGlobal;
    if (
      typeof anyGlobal === "object" &&
      anyGlobal !== null &&
      "currentOrganizationId" in anyGlobal
    ) {
      const value = (
        anyGlobal as {
          currentOrganizationId?: unknown;
        }
      ).currentOrganizationId;
      return typeof value === "string" ? value : undefined;
    }
    return undefined;
  })();
  if (!organizationId) {
    throw new HttpException("Organization context is required", 400);
  }
  if (
    parent.reportGenerationRun.reportDefinition
      .erp_hrm_time_tracking_organization_id !== organizationId
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3) Validate uniqueness if metric_name is changing
  if (props.body.metric_name !== undefined) {
    const conflict =
      await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findFirst(
        {
          where: {
            erp_hrm_time_tracking_report_output_id:
              metric.erp_hrm_time_tracking_report_output_id,
            metric_name: props.body.metric_name,
            id: { not: props.reportOutputMetricId },
            deleted_at: null,
          },
          select: { id: true },
        },
      );
    if (conflict) {
      throw new HttpException(
        "Metric name already exists for this report output",
        409,
      );
    }
  }
  // 4) Apply update
  await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.update({
    where: { id: props.reportOutputMetricId },
    data: {
      ...(props.body.metric_name !== undefined && {
        metric_name: props.body.metric_name,
      }),
      ...(props.body.metric_value !== undefined && {
        metric_value: props.body.metric_value,
      }),
    },
  });
  // 5) Return DTO without transformer (avoid compilation dependency)
  const updatedFull =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findUniqueOrThrow(
      {
        where: { id: props.reportOutputMetricId },
        select: {
          id: true,
          erp_hrm_time_tracking_report_output_id: true,
          metric_name: true,
          metric_value: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  return {
    ...updatedFull,
    id: typia.assert<string & tags.Format<"uuid">>(updatedFull.id),
    erp_hrm_time_tracking_report_output_id: typia.assert<
      string & tags.Format<"uuid">
    >(updatedFull.erp_hrm_time_tracking_report_output_id),
    metric_value: typia.assert<number>(updatedFull.metric_value),
    metric_name: typia.assert<string>(updatedFull.metric_name),
    deleted_at:
      updatedFull.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(updatedFull.deleted_at),
          ),
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(updatedFull.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(updatedFull.updated_at),
    ),
  };
}
