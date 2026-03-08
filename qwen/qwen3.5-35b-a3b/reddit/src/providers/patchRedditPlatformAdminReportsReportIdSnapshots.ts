import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformReportSnapshotTransformer } from "../transformers/RedditPlatformReportSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminReportsReportIdSnapshots(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReportSnapshot.IRequest;
}): Promise<IPageIRedditPlatformReportSnapshot> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 50, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_report_snapshotsWhereInput = {
    reddit_platform_report_id: props.reportId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.snapshot_created_at_from !== undefined && {
      snapshot_created_at: {
        gte: new Date(props.body.snapshot_created_at_from),
      },
    }),
    ...(props.body.snapshot_created_at_to !== undefined && {
      snapshot_created_at: { lte: new Date(props.body.snapshot_created_at_to) },
    }),
    ...(props.body.resolved_by !== undefined && {
      resolved_by: props.body.resolved_by,
    }),
  };
  const orderByInput: Prisma.reddit_platform_report_snapshotsOrderByWithRelationInput =
    props.body.sortOrder === "asc"
      ? { snapshot_created_at: "asc" }
      : { snapshot_created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_platform_report_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformReportSnapshotTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_report_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformReportSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
