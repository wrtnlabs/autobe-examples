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

export async function patchRedditPlatformMemberCommunitiesCommunityNameReports(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<50> = props.body.limit ?? 20;
  const effectiveLimit: number & tags.Type<"int32"> = Math.min(limit, 50);
  const skip: number = (page - 1) * effectiveLimit;
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const membership =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        user_id: props.member.id,
        community_id: community.id,
        role: {
          in: ["moderator", "owner"],
        },
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_platform_reportsWhereInput = {
    community_id: community.id,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: typia.assert<string>(props.body.status),
    }),
    ...(props.body.target_type !== undefined && {
      target_type: props.body.target_type,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_reports.findMany({
      where: whereInput,
      skip,
      take: effectiveLimit,
      orderBy: { created_at: "desc" },
      ...RedditPlatformReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_reports.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: effectiveLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
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
// export async function patchRedditPlatformMemberCommunitiesCommunityNameReports(props: {
//   member: MemberPayload;
//   communityName: string;
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