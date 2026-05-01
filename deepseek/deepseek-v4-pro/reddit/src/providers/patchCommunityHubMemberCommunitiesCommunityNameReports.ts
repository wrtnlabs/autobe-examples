import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubReportAtSummaryTransformer } from "../transformers/CommunityHubReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityHubReport.IRequest;
}): Promise<IPageICommunityHubReport.ISummary> {
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: "insensitive" },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const moderatorRole =
    await MyGlobal.prisma.community_hub_community_moderators.findFirst({
      where: {
        community_hub_community_id: community.id,
        community_hub_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page =
    props.body.page != null && props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_hub_community_id: community.id,
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
  } satisfies Prisma.community_hub_reportsWhereInput;
  const records = await MyGlobal.prisma.community_hub_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityHubReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_hub_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityHubReportAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
// import { IPageICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMemberCommunitiesCommunityNameReports(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: ICommunityHubReport.IRequest;
// }): Promise<IPageICommunityHubReport.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_reports.findMany({
//     ...CommunityHubReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------