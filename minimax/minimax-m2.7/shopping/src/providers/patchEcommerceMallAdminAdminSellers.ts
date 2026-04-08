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

export async function patchEcommerceMallAdminAdminSellers(props: {
  admin: AdminPayload;
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? (1 as const);
  const limit = Math.min(props.body.limit ?? (20 as const), 100);
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.ecommerce_mall_sellersWhereInput[] = [];
  // Soft delete filter
  if (props.body.showDeleted !== true) {
    whereConditions.push({
      deleted_at: null,
    });
  }
  // Email search filter (case-insensitive partial match)
  if (props.body.search) {
    whereConditions.push({
      email: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    });
  }
  // Approval status filter
  if (props.body.status) {
    whereConditions.push({
      approval_status: props.body.status,
    });
  }
  // Date range filter: from date
  if (props.body.dateFrom) {
    whereConditions.push({
      created_at: {
        gte: props.body.dateFrom,
      },
    });
  }
  // Date range filter: to date
  if (props.body.dateTo) {
    whereConditions.push({
      created_at: {
        lte: props.body.dateTo,
      },
    });
  }
  // Combine all WHERE conditions
  const where =
    whereConditions.length > 0 ? { AND: whereConditions } : undefined;
  // Build ORDER BY clause
  let orderBy: Prisma.ecommerce_mall_sellersOrderByWithRelationInput;
  if (props.body.sortBy === "email") {
    orderBy = {
      email: props.body.sortOrder === "desc" ? "desc" : "asc",
    };
  } else if (props.body.sortBy === "approval_status") {
    orderBy = {
      approval_status: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  } else {
    // Default: sort by created_at DESC (newest first)
    orderBy = {
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  }
  // Execute findMany query with pagination
  const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallSellerAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_sellers.count({
    where,
  });
  // Transform records and build response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// export async function patchEcommerceMallAdminAdminSellers(props: {
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