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

export async function patchCommunityMemberMemberReports(props: {
  member: MemberPayload;
  body: ICommunityReport.IRequest;
}): Promise<IPageICommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const dateFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdFrom) {
    dateFilter.gte = new Date(props.body.createdFrom);
  }
  if (props.body.createdTo) {
    dateFilter.lte = new Date(props.body.createdTo);
  }
  const searchValue = props.body.search?.trim();
  const whereInput = {
    reporter_id: props.member.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.contentType && { content_type: props.body.contentType }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter }),
    ...(searchValue && {
      reason: { contains: searchValue, mode: "insensitive" as const },
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
