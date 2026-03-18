import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerReportsReportIdExecutions(props: {
  owner: OwnerPayload;
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportSnapshot.ICreate;
}): Promise<IHrmTimeTrackingReportSnapshot> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        report_type: true,
        range_start_date: true,
        range_end_date: true,
        group_by: true,
        billable_only: true,
        include_non_billable: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (
    report.report_type !== "time_report" &&
    report.report_type !== "project_budget_report" &&
    report.report_type !== "weekly_summary_report"
  ) {
    throw new HttpException("Unsupported report type", 400);
  }
  if (props.body.period_start > props.body.period_end) {
    throw new HttpException("Invalid period", 400);
  }
  const snapshotId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const snapshot =
    await MyGlobal.prisma.hrm_time_tracking_report_snapshots.create({
      data: {
        id: snapshotId,
        output_uri: props.body.output_uri,
        output_format: props.body.output_format,
        period_start: props.body.period_start,
        period_end: props.body.period_end,
        row_count: props.body.row_count ?? null,
        generated_at: props.body.generated_at,
        created_at: props.body.generated_at,
        updated_at: props.body.generated_at,
        deleted_at: null,
        report: {
          connect: {
            id: report.id,
          },
        },
      },
      select: {
        id: true,
        output_uri: true,
        output_format: true,
        period_start: true,
        period_end: true,
        row_count: true,
        generated_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            id: true,
            name: true,
            report_type: true,
            range_start_date: true,
            range_end_date: true,
            group_by: true,
            billable_only: true,
            include_non_billable: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.hrm_time_tracking_reportsFindManyArgs,
      },
    });
  return {
    id: snapshot.id,
    report: {
      id: snapshot.report.id,
      name: snapshot.report.name,
      report_type: snapshot.report.report_type,
      range_start_date:
        snapshot.report.range_start_date !== null
          ? toISOStringSafe(snapshot.report.range_start_date)
          : null,
      range_end_date:
        snapshot.report.range_end_date !== null
          ? toISOStringSafe(snapshot.report.range_end_date)
          : null,
      group_by: snapshot.report.group_by,
      billable_only: snapshot.report.billable_only,
      include_non_billable: snapshot.report.include_non_billable,
      created_at: toISOStringSafe(snapshot.report.created_at),
      updated_at: toISOStringSafe(snapshot.report.updated_at),
    } satisfies IHrmTimeTrackingReport.ISummary,
    output_uri: snapshot.output_uri,
    output_format: snapshot.output_format,
    period_start: toISOStringSafe(snapshot.period_start),
    period_end: toISOStringSafe(snapshot.period_end),
    row_count: snapshot.row_count,
    generated_at: toISOStringSafe(snapshot.generated_at),
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at:
      snapshot.deleted_at !== null
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
  } satisfies IHrmTimeTrackingReportSnapshot;
}
