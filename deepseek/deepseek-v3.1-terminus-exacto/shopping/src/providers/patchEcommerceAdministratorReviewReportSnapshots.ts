import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewReportSnapshotAtSummaryTransformer } from "../transformers/EcommerceReviewReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewReportSnapshots(props: {
  administrator: AdministratorPayload;
  body: IEcommerceReviewReportSnapshot.IRequest;
}): Promise<IPageIEcommerceReviewReportSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_review_report_snapshotsWhereInput = {
    ...(props.body.snapshot_created_at_start && {
      snapshot_created_at: {
        gte: new Date(props.body.snapshot_created_at_start),
      },
    }),
    ...(props.body.snapshot_created_at_end && {
      snapshot_created_at: {
        lte: new Date(props.body.snapshot_created_at_end),
      },
    }),
    ...(props.body.actor_id && { actor_id: props.body.actor_id }),
    ...(props.body.report_category && {
      report_category: {
        contains: props.body.report_category,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.report_reason && {
      report_reason: {
        contains: props.body.report_reason,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
    ...(props.body.review_id && { review_id: props.body.review_id }),
    ...(props.body.search && {
      OR: [
        {
          report_reason: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          report_category: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_review_report_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { snapshot_created_at: "desc" as const },
      ...EcommerceReviewReportSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_review_report_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceReviewReportSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
