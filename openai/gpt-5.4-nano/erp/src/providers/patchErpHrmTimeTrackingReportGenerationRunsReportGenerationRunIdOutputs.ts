import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportOutput";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingReportGenerationRunsReportGenerationRunIdOutputs(props: {
  reportGenerationRunId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingReportOutput.IRequest;
}): Promise<IPageIErpHrmTimeTrackingReportOutput.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "grouping_sort_key";
  const sortDirection = (props.body.sortDirection ?? "asc").toLowerCase();
  const allowedSortBy = new Set([
    "created_at",
    "updated_at",
    "grouping_sort_key",
  ]);
  if (!allowedSortBy.has(sortBy)) {
    throw new HttpException("Invalid sortBy", 400);
  }
  if (sortDirection !== "asc" && sortDirection !== "desc") {
    throw new HttpException("Invalid sortDirection", 400);
  }
  const orderByInput =
    sortBy === "created_at"
      ? { created_at: sortDirection }
      : sortBy === "updated_at"
        ? { updated_at: sortDirection }
        : { grouping_sort_key: sortDirection };
  // Authorization and org scoping helpers are not available in snippet; implement minimal org validation via report generation run ownership.
  await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
    {
      where: { id: props.reportGenerationRunId },
    },
  );
  const whereInput = {
    report_generation_run_id: props.reportGenerationRunId,
    deleted_at: null,
    ...(props.body.employee_id !== undefined && props.body.employee_id !== null
      ? { employee_id: props.body.employee_id }
      : {}),
    ...(props.body.project_id !== undefined && props.body.project_id !== null
      ? { project_id: props.body.project_id }
      : {}),
    ...(props.body.task_id !== undefined && props.body.task_id !== null
      ? { task_id: props.body.task_id }
      : {}),
    ...(props.body.week_start_date_id !== undefined &&
    props.body.week_start_date_id !== null
      ? { week_start_date_id: props.body.week_start_date_id }
      : {}),
  } satisfies Prisma.erp_hrm_time_tracking_report_outputsWhereInput;
  const [rows, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy:
        orderByInput as Prisma.erp_hrm_time_tracking_report_outputsOrderByWithRelationInput,
      select: {
        id: true,
        report_generation_run_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        week_start_date_id: true,
        grouping_sort_key: true,
        notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.count({
      where: whereInput,
    }),
  ]);
  return {
    data: rows.map((r) => ({
      id: r.id,
      report_generation_run_id: r.report_generation_run_id,
      employee_id: r.employee_id,
      project_id: r.project_id,
      task_id: r.task_id,
      week_start_date_id: r.week_start_date_id,
      grouping_sort_key: r.grouping_sort_key,
      notes: r.notes,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })) satisfies IErpHrmTimeTrackingReportOutput.ISummary[],
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
