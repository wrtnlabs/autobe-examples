import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityAdminAtSummaryTransformer } from "../transformers/RedditCommunityAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditCommunityAdmin.IRequest;
}): Promise<IPageIRedditCommunityAdmin.ISummary> {
  // Pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Validate limit range
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit parameter", 400);
  }
  // Calculate skip for offset-based pagination
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereClause: Prisma.reddit_community_adminsWhereInput = {};
  // Soft delete filtering
  if (props.body.include_deleted === true) {
    // Include all records regardless of deleted_at
    whereClause.deleted_at = undefined;
  } else {
    // Filter out soft-deleted records by default
    whereClause.deleted_at = null;
  }
  // Email filter (LIKE query)
  if (
    props.body.email_filter !== undefined &&
    props.body.email_filter !== null
  ) {
    whereClause.email = {
      contains: props.body.email_filter,
      mode: "insensitive" as const,
    };
  }
  // Display name filter (LIKE query)
  if (
    props.body.display_name_filter !== undefined &&
    props.body.display_name_filter !== null
  ) {
    whereClause.display_name = {
      contains: props.body.display_name_filter,
      mode: "insensitive" as const,
    };
  }
  // Active status filter
  if (props.body.active_status === "active") {
    whereClause.is_active = true;
  } else if (props.body.active_status === "inactive") {
    whereClause.is_active = false;
  }
  // 'all' or undefined: no filter on is_active
  // Build ORDER BY clause
  const orderByInput = (() => {
    const sortField = props.body.sort ?? "created_at";
    const sortDirection = props.body.sortDirection ?? "desc";
    const orderValue: "asc" | "desc" | Prisma.SortOrder | Prisma.SortOrder[] =
      sortDirection === "asc" ? "asc" : "desc";
    return {
      [sortField]: orderValue,
    } satisfies Prisma.reddit_community_adminsOrderByWithRelationInput;
  })();
  // Execute query
  const [records, totalRecords] = await Promise.all([
    MyGlobal.prisma.reddit_community_admins.findMany({
      where: whereClause,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_admins.count({
      where: whereClause,
    }),
  ]);
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    records,
    RedditCommunityAdminAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityAdmin.ISummary;
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
// import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
// import { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminAdmins(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityAdmin.IRequest;
// }): Promise<IPageIRedditCommunityAdmin.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_admins.findMany({
//     ...RedditCommunityAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------