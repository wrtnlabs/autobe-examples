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
import { HrmTimeTrackingReportAtSummaryTransformer } from "../transformers/HrmTimeTrackingReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingReports(props: {
  body: IHrmTimeTrackingReport.IRequest;
}): Promise<IPageIHrmTimeTrackingReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const supportedReportTypes = [
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ];
  if (
    props.body.report_type !== undefined &&
    supportedReportTypes.includes(props.body.report_type) === false
  ) {
    throw new HttpException("Invalid report_type", 400);
  }
  const supportedSorts = [
    "updated_at_desc",
    "created_at_desc",
    "name_asc",
    "name_desc",
  ];
  if (
    props.body.sort !== undefined &&
    supportedSorts.includes(props.body.sort) === false
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  const context = await (async function getContext(): Promise<{
    organizationId: string & tags.Format<"uuid">;
    permissions: string[];
  }> {
    const candidate: unknown = Reflect.get(
      globalThis,
      "__hrm_time_tracking_context",
    );
    if (
      typia.is<{
        organizationId: string & tags.Format<"uuid">;
        permissions: string[];
      }>(candidate) === true
    ) {
      return candidate;
    }
    throw new HttpException("Forbidden", 403);
  })();
  if (context.permissions.includes("report:view") === false) {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
    hrm_time_tracking_organization_id: context.organizationId,
    deleted_at: null,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.report_type !== undefined
      ? {
          report_type: props.body.report_type,
        }
      : {}),
    ...(props.body.group_by !== undefined
      ? {
          group_by: props.body.group_by,
        }
      : {}),
    ...(props.body.billable_only !== undefined
      ? {
          billable_only: props.body.billable_only,
        }
      : {}),
    ...(props.body.include_non_billable !== undefined
      ? {
          include_non_billable: props.body.include_non_billable,
        }
      : {}),
    ...(props.body.range_start_date !== undefined &&
    props.body.range_end_date !== undefined
      ? {
          AND: [
            {
              OR: [
                { range_end_date: null },
                { range_end_date: { gte: props.body.range_start_date } },
              ],
            },
            {
              OR: [
                { range_start_date: null },
                { range_start_date: { lte: props.body.range_end_date } },
              ],
            },
          ],
        }
      : props.body.range_start_date !== undefined
        ? {
            OR: [
              { range_end_date: null },
              { range_end_date: { gte: props.body.range_start_date } },
            ],
          }
        : props.body.range_end_date !== undefined
          ? {
              OR: [
                { range_start_date: null },
                { range_start_date: { lte: props.body.range_end_date } },
              ],
            }
          : {}),
  } satisfies Prisma.hrm_time_tracking_reportsWhereInput;
  const orderBy =
    props.body.sort === "created_at_desc"
      ? ([
          { created_at: "desc" },
          { id: "desc" },
        ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
      : props.body.sort === "name_asc"
        ? ([
            { name: "asc" },
            { id: "asc" },
          ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
        : props.body.sort === "name_desc"
          ? ([
              { name: "desc" },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[])
          : ([
              { updated_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_reportsOrderByWithRelationInput[]);
  const [rows, records] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTimeTrackingReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_time_tracking_reports.count({
      where,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      HrmTimeTrackingReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
