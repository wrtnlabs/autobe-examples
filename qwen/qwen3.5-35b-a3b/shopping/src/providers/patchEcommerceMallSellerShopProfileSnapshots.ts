import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallShopProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallShopProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShopProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallShopProfileSnapshot.IRequest;
}): Promise<IPageIEcommerceMallShopProfileSnapshot.ISummary> {
  const pageParam = props.body.page ?? null;
  const limit = props.body.limit ?? 100;
  // Calculate pagination
  const currentPage =
    pageParam === null ? 1 : Math.ceil((parseInt(pageParam, 10) + 1) * 1) / 1;
  const skip = pageParam === null ? 0 : parseInt(pageParam, 10) * limit;
  // Build WHERE clause with seller filter
  const where: Prisma.ecommerce_mall_shop_profile_snapshotsWhereInput = {};
  // Apply date range filters
  const dateFilters: {
    gte?: string | Date;
    lte?: string | Date;
  } = {};
  if (
    props.body.createdAfter !== undefined &&
    props.body.createdAfter !== null
  ) {
    dateFilters.gte = props.body.createdAfter;
  }
  if (
    props.body.createdBefore !== undefined &&
    props.body.createdBefore !== null
  ) {
    dateFilters.lte = props.body.createdBefore;
  }
  if (Object.keys(dateFilters).length > 0) {
    where.created_at = dateFilters;
  }
  // Apply shop name text search
  if (
    props.body.shopNameSearch !== undefined &&
    props.body.shopNameSearch !== null
  ) {
    where.shop_name = {
      contains: props.body.shopNameSearch,
    };
  }
  // Build ORDER BY with default sorting by created_at descending
  const orderBy: Prisma.ecommerce_mall_shop_profile_snapshotsOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  if (props.body.sortBy !== undefined && props.body.sortBy !== null) {
    const sortField = props.body.sortBy;
    const sortDir = props.body.sortDir ?? "DESC";
    if (sortField === "created_at") {
      orderBy[0] = { created_at: sortDir === "ASC" ? "asc" : "desc" };
    } else if (sortField === "id") {
      orderBy[0] = { id: sortDir === "ASC" ? "asc" : "desc" };
    } else if (sortField === "shop_name") {
      orderBy[0] = { shop_name: sortDir === "ASC" ? "asc" : "desc" };
    }
  }
  // Query records
  const records =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...EcommerceMallShopProfileSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.count({
      where,
    });
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    records,
    EcommerceMallShopProfileSnapshotAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
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
// import { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
// import { IPageIEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerShopProfileSnapshots(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallShopProfileSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallShopProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_shop_profile_snapshots.findMany({
//     ...EcommerceMallShopProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallShopProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------