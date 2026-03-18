import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingReportSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackingReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingReportsReportIdSnapshots(props: {
  reportId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingReportSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackingReportSnapshot.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const direction: "asc" | "desc" = props.body.direction ?? "desc";
  const whereInput = {
    hrm_time_tracking_report_id: props.reportId,
    deleted_at: null,
    ...(props.body.outputFormat !== undefined && {
      output_format: props.body.outputFormat,
    }),
    ...(props.body.generatedAtFrom !== undefined ||
    props.body.generatedAtTo !== undefined
      ? {
          generated_at: {
            ...(props.body.generatedAtFrom !== undefined && {
              gte: props.body.generatedAtFrom,
            }),
            ...(props.body.generatedAtTo !== undefined && {
              lte: props.body.generatedAtTo,
            }),
          },
        }
      : {}),
    ...(props.body.periodStartFrom !== undefined ||
    props.body.periodStartTo !== undefined
      ? {
          period_start: {
            ...(props.body.periodStartFrom !== undefined && {
              gte: props.body.periodStartFrom,
            }),
            ...(props.body.periodStartTo !== undefined && {
              lte: props.body.periodStartTo,
            }),
          },
        }
      : {}),
    ...(props.body.periodEndFrom !== undefined ||
    props.body.periodEndTo !== undefined
      ? {
          period_end: {
            ...(props.body.periodEndFrom !== undefined && {
              gte: props.body.periodEndFrom,
            }),
            ...(props.body.periodEndTo !== undefined && {
              lte: props.body.periodEndTo,
            }),
          },
        }
      : {}),
    ...(props.body.rowCountMin !== undefined ||
    props.body.rowCountMax !== undefined
      ? {
          row_count: {
            ...(props.body.rowCountMin !== undefined && {
              gte: props.body.rowCountMin,
            }),
            ...(props.body.rowCountMax !== undefined && {
              lte: props.body.rowCountMax,
            }),
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_report_snapshotsWhereInput;
  const orderByInput =
    props.body.sort === "generatedAt"
      ? ([
          { generated_at: direction },
          { id: "desc" },
        ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
      : props.body.sort === "periodStart"
        ? ([
            { period_start: direction },
            { id: "desc" },
          ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
        : props.body.sort === "periodEnd"
          ? ([
              { period_end: direction },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
          : props.body.sort === "outputFormat"
            ? ([
                { output_format: direction },
                { id: "desc" },
              ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
            : props.body.sort === "createdAt"
              ? ([
                  { created_at: direction },
                  { id: "desc" },
                ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
              : props.body.sort === "updatedAt"
                ? ([
                    { updated_at: direction },
                    { id: "desc" },
                  ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[])
                : ([
                    { generated_at: "desc" },
                    { id: "desc" },
                  ] satisfies Prisma.hrm_time_tracking_report_snapshotsOrderByWithRelationInput[]);
  const data =
    await MyGlobal.prisma.hrm_time_tracking_report_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...HrmTimeTrackingReportSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.hrm_time_tracking_report_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingReportSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
