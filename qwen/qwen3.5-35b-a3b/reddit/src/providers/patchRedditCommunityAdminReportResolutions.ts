import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportResolution";
import { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityReportResolutionAtSummaryTransformer } from "../transformers/RedditCommunityReportResolutionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminReportResolutions(props: {
  admin: AdminPayload;
  body: IRedditCommunityReportResolution.IRequest;
}): Promise<IPageIRedditCommunityReportResolution.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_report_resolutionsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.resolution_type !== undefined && {
      resolution_type: props.body.resolution_type,
    }),
    ...(props.body.admin_id !== undefined && {
      reddit_community_admin_id: props.body.admin_id,
    }),
    ...(props.body.community_id !== undefined && {
      report: { community_id: props.body.community_id },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  };
  if (
    props.body.resolved_at_from !== undefined ||
    props.body.resolved_at_to !== undefined
  ) {
    whereInput.resolved_at = {};
    if (props.body.resolved_at_from !== undefined) {
      whereInput.resolved_at.gte = new Date(props.body.resolved_at_from);
    }
    if (props.body.resolved_at_to !== undefined) {
      whereInput.resolved_at.lte = new Date(props.body.resolved_at_to);
    }
  }
  const orderByInput: Prisma.reddit_community_report_resolutionsOrderByWithRelationInput =
    props.body.sort_by === "resolved_at"
      ? { resolved_at: (props.body.sort_order ?? "desc") as "asc" | "desc" }
      : props.body.sort_by === "status"
        ? { status: (props.body.sort_order ?? "desc") as "asc" | "desc" }
        : props.body.sort_by === "resolution_type"
          ? {
              resolution_type: (props.body.sort_order ?? "desc") as
                | "asc"
                | "desc",
            }
          : { created_at: (props.body.sort_order ?? "desc") as "asc" | "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_resolutions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit + 1,
      ...RedditCommunityReportResolutionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_report_resolutions.count({
      where: whereInput,
    }),
  ]);
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityReportResolutionAtSummaryTransformer.transform,
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
// import { IRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportResolution";
// import { IPageIRedditCommunityReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportResolution";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminReportResolutions(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityReportResolution.IRequest;
// }): Promise<IPageIRedditCommunityReportResolution.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_report_resolutions.findMany({
//     ...RedditCommunityReportResolutionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityReportResolutionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------