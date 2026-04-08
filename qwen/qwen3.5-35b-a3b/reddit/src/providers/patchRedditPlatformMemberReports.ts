import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify user has moderator role for any community
  const moderatorCheck =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        user: { id: props.member.id },
        role: "moderator" as const,
        deleted_at: null,
      },
    });
  if (moderatorCheck === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Default status to 'pending' for active reports
  const statusFilter =
    typeof props.body.status === "string" ? props.body.status : "pending";
  const created_at_from = props.body.created_at_from;
  const created_at_to = props.body.created_at_to;
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    deleted_at: null,
    status: statusFilter,
    ...(created_at_from !== undefined && {
      created_at: { gte: created_at_from },
    }),
    ...(created_at_to !== undefined && { created_at: { lte: created_at_to } }),
  };
  const orderByInput: Prisma.reddit_platform_reportsOrderByWithRelationInput =
    props.body.sort === "reviewed_at"
      ? { reviewed_at: "desc" as const }
      : props.body.sort === "status"
        ? { status: "desc" as const }
        : { created_at: "desc" as const };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_reports.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_reports.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformReportAtSummaryTransformer.transform,
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
// import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
// import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberReports(props: {
//   member: MemberPayload;
//   body: IRedditPlatformReport.IRequest;
// }): Promise<IPageIRedditPlatformReport.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_reports.findMany({
//     ...RedditPlatformReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------