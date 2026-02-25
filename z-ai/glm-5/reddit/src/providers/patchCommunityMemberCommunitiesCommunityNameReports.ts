import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityReportAtSummaryTransformer } from "../transformers/CommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  // 1. Find community by name
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { name: props.communityName },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify moderator permission
  const moderatorRecord = await MyGlobal.prisma.community_moderators.findUnique(
    {
      where: {
        community_id_member_id: {
          community_id: community.id,
          member_id: props.member.id,
        },
      },
    },
  );
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Build WHERE clause from request body
  const whereInput = {
    community_id: community.id,
    ...(props.body.status !== null &&
      props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.contentType !== null &&
      props.body.contentType !== undefined && {
        content_type: props.body.contentType,
      }),
    ...(props.body.search !== null &&
      props.body.search !== undefined && {
        reason: { contains: props.body.search, mode: "insensitive" as const },
      }),
    ...(props.body.createdFrom !== null &&
      props.body.createdFrom !== undefined && {
        created_at: { gte: new Date(props.body.createdFrom) },
      }),
    ...(props.body.createdTo !== null &&
      props.body.createdTo !== undefined && {
        created_at: { lte: new Date(props.body.createdTo) },
      }),
  } satisfies Prisma.community_reportsWhereInput;
  // 4. Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // 5. Query reports with transformer select
  const reports = await MyGlobal.prisma.community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityReportAtSummaryTransformer.select(),
  });
  // 6. Get total count
  const total = await MyGlobal.prisma.community_reports.count({
    where: whereInput,
  });
  // 7. Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      reports,
      CommunityReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityReport.ISummary;
}
