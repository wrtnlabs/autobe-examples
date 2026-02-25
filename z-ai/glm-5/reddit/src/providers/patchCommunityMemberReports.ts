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

export async function patchCommunityMemberReports(props: {
  member: MemberPayload;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Validate moderator access - moderators can only view reports for their communities
  if (props.body.communityId) {
    const moderatorRecord =
      await MyGlobal.prisma.community_moderators.findFirst({
        where: {
          community_id: props.body.communityId,
          member_id: props.member.id,
        },
      });
    if (!moderatorRecord) {
      throw new HttpException("You are not a moderator of this community", 403);
    }
  }
  // Build where clause with all filters
  const whereInput = {
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.contentType && { content_type: props.body.contentType }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.community_reportsWhereInput;
  const data = await MyGlobal.prisma.community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_reports.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
