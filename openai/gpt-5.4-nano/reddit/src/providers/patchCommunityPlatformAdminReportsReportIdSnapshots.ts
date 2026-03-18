import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminReportsReportIdSnapshots(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportSnapshot.IRequest;
}): Promise<IPageICommunityPlatformReportSnapshot.ISummary> {
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const report = await MyGlobal.prisma.community_platform_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true, deleted_at: true, community_id: true },
  });
  if (report === null || report.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const currentPage = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (currentPage - 1) * limit;
  const where = {
    deleted_at: null,
    community_platform_report_id: props.reportId,
    ...(props.body.snapshotStatus !== undefined
      ? { snapshot_status: props.body.snapshotStatus }
      : {}),
    ...(props.body.hasDecision !== undefined
      ? props.body.hasDecision
        ? { snapshot_decisioned_at: { not: null } }
        : { snapshot_decisioned_at: null }
      : {}),
  } satisfies Prisma.community_platform_report_snapshotsWhereInput;
  const order: Prisma.SortOrder = props.body.sort === "asc" ? "asc" : "desc";
  const orderBy = {
    captured_at: order,
  } satisfies Prisma.community_platform_report_snapshotsOrderByWithRelationInput;
  const snapshots =
    await MyGlobal.prisma.community_platform_report_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformReportSnapshotAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.community_platform_report_snapshots.count({ where });
  const pages = Math.ceil(records / limit);
  return {
    data: await ArrayUtil.asyncMap(
      snapshots as unknown as Parameters<
        typeof CommunityPlatformReportSnapshotAtSummaryTransformer.transform
      >[0][],
      (item) =>
        CommunityPlatformReportSnapshotAtSummaryTransformer.transform(item),
    ),
    pagination: {
      current: currentPage,
      limit,
      records,
      pages: pages as any,
    } satisfies IPageICommunityPlatformReportSnapshot.ISummary["pagination"],
  };
}
