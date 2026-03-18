import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTrackingReportOutputMetricAtSummaryTransformer } from "../transformers/ErpHrmTimeTrackingReportOutputMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportOutputsReportOutputIdMetrics(props: {
  reportOutputId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportOutputMetric.IRequest;
}): Promise<IErpHrmTimeTrackingReportOutputMetric.ISummary> {
  const { reportOutputId, body } = props;
  const items = body.items;
  const seenMetricNames = new Set<string>();
  const metricNames: string[] = [];
  for (const item of items) {
    const metricNameUnknown: unknown = item.metric_name;
    const metricName = typia.assert<string>(metricNameUnknown);
    if (seenMetricNames.has(metricName)) {
      throw new HttpException(
        "Duplicate metric_name in request is not allowed",
        400,
      );
    }
    seenMetricNames.add(metricName);
    metricNames.push(metricName);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const item of items) {
      const metricName = typia.assert<string>(item.metric_name as unknown);
      const remove =
        (
          item as unknown as {
            remove?: boolean | null;
          }
        ).remove === true;
      if (remove) {
        await tx.erp_hrm_time_tracking_report_output_metrics.updateMany({
          where: {
            erp_hrm_time_tracking_report_output_id: reportOutputId,
            metric_name: metricName,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
            updated_at: new Date(),
          },
        });
        continue;
      }
      const metricValueUnknown: unknown = (
        item as unknown as {
          metric_value?: unknown;
        }
      ).metric_value;
      if (
        typeof metricValueUnknown !== "number" ||
        !Number.isFinite(metricValueUnknown)
      ) {
        throw new HttpException("metric_value must be a finite number", 400);
      }
      const metricValue = metricValueUnknown;
      await tx.erp_hrm_time_tracking_report_output_metrics.upsert({
        where: {
          erp_hrm_time_tracking_report_output_id_metric_name: {
            erp_hrm_time_tracking_report_output_id: reportOutputId,
            metric_name: metricName,
          },
        },
        create: {
          id: v4(),
          erp_hrm_time_tracking_report_output_id: reportOutputId,
          metric_name: metricName,
          metric_value: metricValue,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        update: {
          metric_value: metricValue,
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.findMany({
      where: {
        erp_hrm_time_tracking_report_output_id: reportOutputId,
        deleted_at: null,
        metric_name: { in: metricNames },
      },
      ...ErpHrmTimeTrackingReportOutputMetricAtSummaryTransformer.select(),
    });
  const summaries = await ArrayUtil.asyncMap(
    updated,
    ErpHrmTimeTrackingReportOutputMetricAtSummaryTransformer.transform,
  );
  const first = summaries[0];
  if (first === undefined) {
    throw new HttpException("No metric summary returned", 404);
  }
  return first;
}
