import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportTransformer } from "../transformers/HrmTimeTrackingReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingReportsReportId(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReport.IUpdate;
}): Promise<IHrmTimeTrackingReport> {
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
      },
    });
  const nextReportType = props.body.report_type ?? report.report_type;
  if (
    nextReportType !== "time_report" &&
    nextReportType !== "project_budget_report" &&
    nextReportType !== "weekly_summary_report"
  ) {
    throw new HttpException("Invalid report type", 400);
  }
  const nextRangeStart =
    props.body.range_start_date === undefined
      ? (report.range_start_date?.toISOString() ?? null)
      : props.body.range_start_date;
  const nextRangeEnd =
    props.body.range_end_date === undefined
      ? (report.range_end_date?.toISOString() ?? null)
      : props.body.range_end_date;
  if (
    nextRangeStart !== null &&
    nextRangeEnd !== null &&
    nextRangeStart > nextRangeEnd
  ) {
    throw new HttpException("Invalid report date range", 400);
  }
  const nextGroupBy =
    props.body.group_by === undefined ? report.group_by : props.body.group_by;
  if (nextReportType === "time_report") {
    if (
      nextGroupBy !== null &&
      nextGroupBy !== "employee" &&
      nextGroupBy !== "project" &&
      nextGroupBy !== "task"
    ) {
      throw new HttpException("Invalid group_by for report type", 400);
    }
  } else if (nextReportType === "weekly_summary_report") {
    if (nextGroupBy !== null && nextGroupBy !== "week") {
      throw new HttpException("Invalid group_by for report type", 400);
    }
  } else if (nextGroupBy !== null) {
    throw new HttpException("Invalid group_by for report type", 400);
  }
  try {
    await MyGlobal.prisma.hrm_time_tracking_reports.update({
      where: {
        id: report.id,
      },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.report_type !== undefined && {
          report_type: props.body.report_type,
        }),
        ...(props.body.range_start_date !== undefined && {
          range_start_date: props.body.range_start_date,
        }),
        ...(props.body.range_end_date !== undefined && {
          range_end_date: props.body.range_end_date,
        }),
        ...(props.body.group_by !== undefined && {
          group_by: props.body.group_by,
        }),
        ...(props.body.billable_only !== undefined && {
          billable_only: props.body.billable_only,
        }),
        ...(props.body.include_non_billable !== undefined && {
          include_non_billable: props.body.include_non_billable,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Report name already exists", 409);
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_reports.findUniqueOrThrow({
      where: {
        id: report.id,
      },
      ...HrmTimeTrackingReportTransformer.select(),
    });
  return await HrmTimeTrackingReportTransformer.transform(updated);
}
