import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const body = props.body;
  // Build where clause conditions
  const whereConditions: Prisma.ecommerce_mall_sellersWhereInput[] = [];
  // Approval status filter
  if (body.approvalStatus !== undefined && body.approvalStatus !== null) {
    whereConditions.push({ approval_status: body.approvalStatus });
  }
  // Email filter (partial match, case-insensitive)
  if (
    body.email !== undefined &&
    body.email !== null &&
    body.email.length > 0
  ) {
    whereConditions.push({
      email: {
        contains: body.email,
        mode: "insensitive",
      },
    });
  }
  // Date range filters - pass ISO strings directly and let Prisma handle conversion
  const hasDateFrom =
    body.createdAtFrom !== undefined && body.createdAtFrom !== null;
  const hasDateTo = body.createdAtTo !== undefined && body.createdAtTo !== null;
  if (hasDateFrom || hasDateTo) {
    whereConditions.push({
      created_at: {
        ...(hasDateFrom && { gte: body.createdAtFrom }),
        ...(hasDateTo && { lte: body.createdAtTo }),
      },
    });
  }
  // Deleted filter - default to excluding soft-deleted accounts
  if (body.includeDeleted !== true) {
    whereConditions.push({ deleted_at: null });
  }
  const where: Prisma.ecommerce_mall_sellersWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};
  // Determine sort configuration
  const sortField = body.sortBy ?? "createdAt";
  const sortDirection = body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_sellersOrderByWithRelationInput = {};
  if (sortField === "createdAt") {
    orderBy.created_at = sortDirection;
  } else if (sortField === "approvalStatus") {
    orderBy.approval_status = sortDirection;
  } else if (sortField === "email") {
    orderBy.email = sortDirection;
  }
  // Pagination configuration
  const pageSize = body.pageSize ?? 20;
  const limit = body.limit ?? pageSize;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  // Execute count query
  const totalCount = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where,
  });
  // Query sellers with pagination
  const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    ...EcommerceMallSellerAtSummaryTransformer.select(),
    where,
    orderBy,
    skip,
    take: limit,
  });
  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerAtSummaryTransformer.transform,
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminSellers(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSeller.IRequest;
// }): Promise<IPageIEcommerceMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
//     ...EcommerceMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------