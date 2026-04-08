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

export async function patchRedditCommunityAdminPostsPostIdReports(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify the admin has moderator privileges for the community containing this post
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { community: true },
  });
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_community_id: post.community.id,
        reddit_community_member_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (!moderatorRole) {
    throw new HttpException(
      "You do not have moderator privileges for this community",
      403,
    );
  }
  // Build where clause for filtering
  const whereClause: Prisma.reddit_community_reportsWhereInput = {
    target_post_id: props.postId,
    deleted_at: null,
  };
  // Apply status filter if provided
  if (props.body.status_id !== undefined) {
    const statusId = parseInt(props.body.status_id, 10);
    whereClause.status_id = statusId;
  }
  // Apply reporter filter if provided
  if (props.body.reporter_id !== undefined) {
    whereClause.reporter_id = props.body.reporter_id;
  }
  // Apply date range filters if provided
  if (
    props.body.created_after !== undefined ||
    props.body.created_before !== undefined
  ) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_after !== undefined) {
      dateFilter.gte = props.body.created_after;
    }
    if (props.body.created_before !== undefined) {
      dateFilter.lte = props.body.created_before;
    }
    whereClause.created_at = dateFilter;
  }
  // Determine sort order
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: "desc" }
      : props.body.sort === "reporter_id"
        ? { reporter_id: "asc" }
        : props.body.sort === "status_id"
          ? { status_id: "asc" }
          : { created_at: "desc" };
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereClause,
  });
  // Fetch paginated reports
  const records = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityReportAtSummaryTransformer.select(),
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
      RedditCommunityReportAtSummaryTransformer.transform,
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
// export async function patchRedditCommunityAdminPostsPostIdReports(props: {
//   admin: AdminPayload;
//   postId: string & tags.Format<"uuid">;
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