import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  // Step 1: Validate community_id is provided
  if (!props.body.community_id) {
    throw new HttpException("community_id is required", 400);
  }
  // Step 2: Check moderator privileges
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (!moderator) {
    throw new HttpException(
      "Forbidden - Not a moderator of this community",
      403,
    );
  }
  // Step 3: Build pagination and WHERE clause
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClause = {
    community_id: props.body.community_id,
    status: props.body.status ?? "pending",
    deleted_at: null,
    ...(props.body.target_type ? { target_type: props.body.target_type } : {}),
    ...(props.body.search
      ? {
          reason: { contains: props.body.search, mode: "insensitive" as const },
        }
      : {}),
  } satisfies Prisma.community_platform_reportsWhereInput;
  // Step 4: Query reports with transformer select
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  // Step 5: Count total matching records
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereClause,
  });
  // Step 6: Transform to DTO
  const data = await ArrayUtil.asyncMap(
    reports,
    CommunityPlatformReportAtSummaryTransformer.transform,
  );
  // Step 7: Return paginated result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
