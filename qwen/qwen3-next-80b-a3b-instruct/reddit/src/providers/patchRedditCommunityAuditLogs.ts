import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAuditLog";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { IRedditCommunityUserAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserAuditLogAtSummaryTransformer } from "../transformers/RedditCommunityUserAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAuditLogs(props: {
  body: IRedditCommunityUserAuditLog.IRequest;
}): Promise<IPageIRedditCommunityUserAuditLog> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with proper typing
  const where: Prisma.reddit_community_user_audit_logsWhereInput = {};
  // Apply optional filters
  if (props.body.action) {
    where.action = props.body.action;
  }
  if (props.body.ip_address) {
    where.ip_address = props.body.ip_address;
  }
  if (props.body.session_id) {
    where.session_id = props.body.session_id;
  }
  // Apply date range filters
  if (props.body.created_at_from || props.body.created_at_to) {
    where.created_at = {};
    if (props.body.created_at_from) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  // Fetch data with transformer select
  const data = await MyGlobal.prisma.reddit_community_user_audit_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityUserAuditLogAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_community_user_audit_logs.count({
    where,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityUserAuditLogAtSummaryTransformer.transform,
  );
  // Narrow action type to literal union using typia.assert per item
  const narrowedData = transformedData.map((item) =>
    typia.assert<IRedditCommunityUserAuditLog>(item),
  );
  return {
    data: narrowedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
