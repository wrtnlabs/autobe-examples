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

export async function patchRedditCommunityAdminReports(props: {
  admin: AdminPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_member_id: props.admin.id,
        deleted_at: null,
      },
      select: { community: true },
    });
  if (moderatorRole === null) {
    throw new HttpException("Unauthorized", 403);
  }
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    community: moderatorRole.community,
  };
  if (
    props.body.status_id !== undefined &&
    props.body.status_id !== null &&
    props.body.status_id !== ""
  ) {
    const statusValue = parseInt(props.body.status_id, 10);
    if (!Number.isNaN(statusValue)) {
      whereInput.status_id = statusValue;
    }
  }
  if (props.body.reporter_id !== undefined && props.body.reporter_id !== null) {
    whereInput.reporter_id = props.body.reporter_id;
  }
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    whereInput.created_at = { gt: new Date(props.body.created_after) };
  }
  if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    if (whereInput.created_at !== undefined) {
      whereInput.created_at = Object.assign({}, whereInput.created_at, {
        lt: new Date(props.body.created_before),
      });
    } else {
      whereInput.created_at = { lt: new Date(props.body.created_before) };
    }
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCommunityReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where: whereInput }),
  ]);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
  const data = await ArrayUtil.asyncMap(
    records,
    RedditCommunityReportAtSummaryTransformer.transform,
  );
  return {
    pagination,
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
// export async function patchRedditCommunityAdminReports(props: {
//   admin: AdminPayload;
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