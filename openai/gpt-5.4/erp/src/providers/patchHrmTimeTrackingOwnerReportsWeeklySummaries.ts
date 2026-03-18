import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingReportAtSummaryTransformer } from "../transformers/HrmTimeTrackingReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerReportsWeeklySummaries(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingReport.IRequest;
}): Promise<IPageIHrmTimeTrackingReport.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
        expired_at: {
          gt: new Date(),
        },
        owner: {
          deleted_at: null,
          deactivated_at: null,
        },
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: {
        id: session.hrm_time_tracking_organization_id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.report_type !== undefined &&
    props.body.report_type !== "weekly_summary_report"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.project_id !== undefined) {
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: props.body.project_id,
        hrm_time_tracking_organization_id: organization.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "updated_at_desc";
  const orderByInput =
    sort === "created_at_asc"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
      : sort === "created_at_desc"
        ? ([
            { created_at: "desc" },
            { id: "desc" },
          ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
        : sort === "name_asc"
          ? ([
              { name: "asc" },
              { id: "asc" },
            ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
          : sort === "name_desc"
            ? ([
                { name: "desc" },
                { id: "desc" },
              ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
            : sort === "updated_at_asc"
              ? ([
                  { updated_at: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
              : ([
                  { updated_at: "desc" },
                  { id: "desc" },
                ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[]);
  const searchFilter =
    props.body.search === undefined
      ? {}
      : ({
          name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        } satisfies Prisma.hrm_time_tracking_reportsWhereInput);
  const whereInput = {
    hrm_time_tracking_organization_id: organization.id,
    deleted_at: null,
    report_type: "weekly_summary_report",
    ...searchFilter,
    ...(props.body.group_by !== undefined && {
      group_by: props.body.group_by,
    }),
    ...(props.body.range_start_date !== undefined && {
      range_start_date: {
        gte: props.body.range_start_date,
      },
    }),
    ...(props.body.range_end_date !== undefined && {
      range_end_date: {
        lte: props.body.range_end_date,
      },
    }),
    ...(props.body.billable_only !== undefined && {
      billable_only: props.body.billable_only,
    }),
    ...(props.body.include_non_billable !== undefined && {
      include_non_billable: props.body.include_non_billable,
    }),
    ...(props.body.project_id !== undefined && {
      projectFilters: {
        some: {
          hrm_time_tracking_project_id: props.body.project_id,
          deleted_at: null,
        },
      },
    }),
  } satisfies Prisma.hrm_time_tracking_reportsWhereInput;
  const data = await MyGlobal.prisma.hrm_time_tracking_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackingReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
