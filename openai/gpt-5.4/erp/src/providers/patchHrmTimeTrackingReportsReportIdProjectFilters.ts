import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReportProjectFilter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportProjectFilterAtSummaryTransformer } from "../transformers/HrmTimeTrackingReportProjectFilterAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingReportsReportIdProjectFilters(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportProjectFilter.IRequest;
}): Promise<IPageIHrmTimeTrackingReportProjectFilter.ISummary> {
  const report =
    await MyGlobal.prisma.hrm_time_tracking_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (report.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput =
    props.body.sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.hrm_time_tracking_report_project_filtersOrderByWithRelationInput[])
      : props.body.sort === "id_asc"
        ? ([
            { id: "asc" },
          ] satisfies Prisma.hrm_time_tracking_report_project_filtersOrderByWithRelationInput[])
        : props.body.sort === "id_desc"
          ? ([
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_report_project_filtersOrderByWithRelationInput[])
          : ([
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_report_project_filtersOrderByWithRelationInput[]);
  const whereInput = {
    hrm_time_tracking_report_id: report.id,
    deleted_at: null,
  } satisfies Prisma.hrm_time_tracking_report_project_filtersWhereInput;
  const rows =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmTimeTrackingReportProjectFilterAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_report_project_filters.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      HrmTimeTrackingReportProjectFilterAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
