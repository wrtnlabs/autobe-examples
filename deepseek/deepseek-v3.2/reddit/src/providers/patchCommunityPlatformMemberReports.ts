import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformContentReportAtSummaryTransformer } from "../transformers/CommunityPlatformContentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformContentReport.IRequest;
}): Promise<IPageICommunityPlatformContentReport.ISummary> {
  // 1. Get moderator community IDs
  const moderatorRoles =
    await MyGlobal.prisma.community_platform_moderation_roles.findMany({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { community_platform_community_id: true },
    });
  if (moderatorRoles.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const moderatorCommunityIds = moderatorRoles.map(
    (r) => r.community_platform_community_id,
  );
  // 2. Validate community_id filter if provided
  if (
    props.body.community_id &&
    !moderatorCommunityIds.includes(props.body.community_id)
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build where clause
  const where: Prisma.community_platform_content_reportsWhereInput = {
    deleted_at: null,
    community_id: { in: moderatorCommunityIds },
  };
  // Override with specific community if filtered
  if (props.body.community_id) {
    where.community_id = props.body.community_id;
  }
  // Apply filters
  if (props.body.status?.length) {
    where.status = { in: props.body.status };
  }
  if (props.body.reporter_member_id) {
    where.reporter_member_id = props.body.reporter_member_id;
  }
  // Content type filter
  if (props.body.content_type === "post") {
    where.postReport = { isNot: null };
  } else if (props.body.content_type === "comment") {
    where.commentReport = { isNot: null };
  }
  // Date range filters
  if (props.body.created_after) {
    where.created_at = { gte: new Date(props.body.created_after) };
  }
  if (props.body.created_before) {
    where.created_at = { lte: new Date(props.body.created_before) };
  }
  // Text search using trigram index
  if (props.body.search) {
    where.reason = { contains: props.body.search, mode: "insensitive" };
  }
  // 4. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 5. Fetch data with transformer
  const data =
    await MyGlobal.prisma.community_platform_content_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformContentReportAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_content_reports.count({
    where,
  });
  // 6. Transform and return
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformContentReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}
