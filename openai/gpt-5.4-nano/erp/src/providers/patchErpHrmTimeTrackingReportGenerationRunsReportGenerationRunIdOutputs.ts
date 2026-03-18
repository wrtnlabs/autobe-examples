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
  const sortDirection = props.body.sortDirection ?? null;
  const orderDirection: "asc" | "desc" =
    sortDirection === "desc" ? "desc" : "asc";
  const sortByRaw = props.body.sortBy ?? null;
  const sortBy: "created_at" | "updated_at" | "grouping_sort_key" =
    sortByRaw === "created_at" ||
    sortByRaw === "updated_at" ||
    sortByRaw === "grouping_sort_key"
      ? sortByRaw
      : "grouping_sort_key";
  const reportGenerationRun =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: props.reportGenerationRunId },
        select: {
          erp_hrm_time_tracking_report_definition_id: true,
        },
      } satisfies Prisma.erp_hrm_time_tracking_report_generation_runsFindUniqueArgs,
    );
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findUniqueOrThrow(
      {
        where: {
          id: reportGenerationRun.erp_hrm_time_tracking_report_definition_id,
        },
        select: {
          erp_hrm_time_tracking_organization_id: true,
          deleted_at: true,
        },
      } satisfies Prisma.erp_hrm_time_tracking_report_definitionsFindUniqueArgs,
    );
  if (reportDefinition.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
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
  const orderBy =
    sortBy === "created_at"
      ? ({
          created_at: orderDirection,
        } satisfies Prisma.erp_hrm_time_tracking_report_outputsOrderByWithRelationInput)
      : sortBy === "updated_at"
        ? ({
            updated_at: orderDirection,
          } satisfies Prisma.erp_hrm_time_tracking_report_outputsOrderByWithRelationInput)
        : ({
            grouping_sort_key: orderDirection,
          } satisfies Prisma.erp_hrm_time_tracking_report_outputsOrderByWithRelationInput);
  const outputs =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs);
  const records =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.count({
      where,
    } satisfies Prisma.erp_hrm_time_tracking_report_outputsCountArgs);
  const pages = Math.ceil(records / limit);
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages,
    },
    data: outputs.map((r) => {
      return {
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
        deleted_at:
          r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
      } satisfies IErpHrmTimeTrackingReportOutput.ISummary;
    }),
  } satisfies IPageIErpHrmTimeTrackingReportOutput.ISummary;
}
