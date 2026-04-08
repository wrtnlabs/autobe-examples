import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminCommunitiesCommunityIdReports(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Invalid page number", 400);
  }
  if (
    props.body.limit !== undefined &&
    (props.body.limit < 1 || props.body.limit > 100)
  ) {
    throw new HttpException("Invalid limit", 400);
  }
  const skip = (page - 1) * limit;
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        community: { id: props.communityId },
        member: { id: props.admin.id },
        deleted_at: null,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    community: { id: props.communityId },
    deleted_at: null,
  };
  if (props.body.status_id !== undefined) {
    whereInput.status_id = parseInt(props.body.status_id, 10);
  }
  if (props.body.reporter_id !== undefined) {
    whereInput.reporter_id = props.body.reporter_id;
  }
  const dateConditions: Prisma.reddit_community_reportsWhereInput[] = [];
  if (props.body.created_after !== undefined) {
    dateConditions.push({
      created_at: { gt: new Date(props.body.created_after) },
    });
  }
  if (props.body.created_before !== undefined) {
    dateConditions.push({
      created_at: { lt: new Date(props.body.created_before) },
    });
  }
  if (dateConditions.length > 0) {
    whereInput.AND = dateConditions;
  }
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
// import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminCommunitiesCommunityIdReports(props: {
//   admin: AdminPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCommunityReport.IRequest;
// }): Promise<IPageIRedditCommunityReport.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_reports.findMany({
//     ...RedditCommunityReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------