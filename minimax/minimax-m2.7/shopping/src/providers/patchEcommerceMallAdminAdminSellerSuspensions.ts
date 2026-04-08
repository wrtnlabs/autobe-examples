import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerSuspensionAtSummaryTransformer } from "../transformers/EcommerceMallSellerSuspensionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminSellerSuspensions(props: {
  admin: AdminPayload;
  body: IEcommerceMallSellerSuspension.IRequest;
}): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
  const body = props.body;
  // Pagination settings
  const limit = Math.min(body.limit ?? 20, 100);
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  const sortOrder = body.sortOrder ?? "desc";
  // Build date range filter for suspended_at
  const getSuspendedAtFilter = ():
    | Record<string, string | undefined>
    | undefined => {
    if (body.suspendedAtFrom && body.suspendedAtTo) {
      return {
        gte: body.suspendedAtFrom,
        lte: body.suspendedAtTo,
      };
    }
    if (body.suspendedAtFrom) {
      return { gte: body.suspendedAtFrom };
    }
    if (body.suspendedAtTo) {
      return { lte: body.suspendedAtTo };
    }
    return undefined;
  };
  // Build date range filter for restored_at
  const getRestoredAtFilter = ():
    | Record<string, string | undefined>
    | undefined => {
    if (body.restoredAtFrom && body.restoredAtTo) {
      return {
        gte: body.restoredAtFrom,
        lte: body.restoredAtTo,
      };
    }
    if (body.restoredAtFrom) {
      return { gte: body.restoredAtFrom };
    }
    if (body.restoredAtTo) {
      return { lte: body.restoredAtTo };
    }
    return undefined;
  };
  // Call filters to get actual filter objects
  const suspendedAtFilter = getSuspendedAtFilter();
  const restoredAtFilter = getRestoredAtFilter();
  // Build final where clause
  const whereClause: Prisma.ecommerce_mall_seller_suspensionsWhereInput = {
    ...(body.sellerId && {
      ecommerce_mall_seller_id: body.sellerId,
    }),
    ...(body.suspendedById && {
      suspended_by_id: body.suspendedById,
    }),
    ...(body.restoredById !== undefined && {
      restored_by_id: body.restoredById,
    }),
    ...(body.status === "active" && {
      restored_at: null,
    }),
    ...(body.status === "resolved" && {
      restored_at: { not: null },
    }),
    ...(suspendedAtFilter && {
      suspended_at: suspendedAtFilter,
    }),
    ...(restoredAtFilter && {
      restored_at: restoredAtFilter,
    }),
  };
  // OrderBy configuration
  const orderByConfig: Prisma.ecommerce_mall_seller_suspensionsOrderByWithRelationInput =
    {
      suspended_at: sortOrder,
    };
  // Determine pagination strategy
  if (body.cursor) {
    // Cursor-based pagination
    const cursorFilter =
      sortOrder === "desc"
        ? { suspended_at: { lt: body.cursor } }
        : { suspended_at: { gt: body.cursor } };
    const records =
      await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
        where: {
          ...whereClause,
          ...cursorFilter,
        },
        orderBy: orderByConfig,
        take: limit,
        ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
      });
    // Get total count for pagination metadata
    const total = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.count(
      {
        where: {
          ...whereClause,
          ...cursorFilter,
        },
      },
    );
    // Transform records to response DTOs
    const data = await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    );
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: data,
    };
  } else {
    // Offset-based pagination
    const records =
      await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
        where: whereClause,
        orderBy: orderByConfig,
        skip,
        take: limit,
        ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
      });
    // Get total count for pagination metadata
    const total = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.count(
      {
        where: whereClause,
      },
    );
    // Transform records to response DTOs
    const data = await ArrayUtil.asyncMap(
      records,
      EcommerceMallSellerSuspensionAtSummaryTransformer.transform,
    );
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: data,
    };
  }
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
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// import { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminSellerSuspensions(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallSellerSuspension.IRequest;
// }): Promise<IPageIEcommerceMallSellerSuspension.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findMany({
//     ...EcommerceMallSellerSuspensionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerSuspensionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------