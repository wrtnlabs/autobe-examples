import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReportSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCloneReportSnapshotAtSummaryTransformer } from "../transformers/RedditCloneReportSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneAdminReportsSnapshots(props: {
  admin: AdminPayload;
  body: IRedditCloneReportSnapshot.IRequest;
}): Promise<IPageIRedditCloneReportSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_reports_snapshotsWhereInput = {};
  if (props.body.community_id !== undefined) {
    whereInput.reddit_clone_community_id = props.body.community_id;
  }
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.reporter_id !== undefined) {
    whereInput.reddit_clone_member_id = props.body.reporter_id;
  }
  if (props.body.target_type !== undefined) {
    whereInput.target_type = props.body.target_type;
  }
  if (
    props.body.captured_at_start !== undefined ||
    props.body.captured_at_end !== undefined
  ) {
    whereInput.captured_at = {};
    if (props.body.captured_at_start !== undefined) {
      whereInput.captured_at.gte = new Date(props.body.captured_at_start);
    }
    if (props.body.captured_at_end !== undefined) {
      whereInput.captured_at.lte = new Date(props.body.captured_at_end);
    }
  }
  if (props.body.reason !== undefined) {
    whereInput.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_clone_reports_snapshotsOrderByWithRelationInput =
    props.body.sort !== undefined
      ? { [props.body.sort]: props.body.direction ?? "desc" }
      : { captured_at: "desc" };
  const data = await MyGlobal.prisma.reddit_clone_reports_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneReportSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_reports_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneReportSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
