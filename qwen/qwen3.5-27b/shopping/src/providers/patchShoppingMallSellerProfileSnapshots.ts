import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  // Get the seller's profile ID
  const sellerProfile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirst({
      where: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (sellerProfile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.shopping_mall_seller_profile_snapshotsWhereInput = {
    shopping_mall_seller_profile_id: sellerProfile.id,
  };
  // Apply date range filters
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Apply changed_fields filter
  if (
    props.body.changed_fields !== undefined &&
    props.body.changed_fields.length > 0
  ) {
    const fieldFilters: Prisma.shopping_mall_seller_profile_snapshotsWhereInput[] =
      [];
    if (props.body.changed_fields.includes("shop_name")) {
      fieldFilters.push({
        OR: [
          { shop_name_before: { not: null } },
          { shop_name_after: { not: null } },
        ],
      });
    }
    if (props.body.changed_fields.includes("shop_description")) {
      fieldFilters.push({
        OR: [
          { shop_description_before: { not: null } },
          { shop_description_after: { not: null } },
        ],
      });
    }
    if (props.body.changed_fields.includes("logo_image")) {
      fieldFilters.push({
        OR: [
          { logo_image_before: { not: null } },
          { logo_image_after: { not: null } },
        ],
      });
    }
    if (fieldFilters.length > 0) {
      whereInput.OR = fieldFilters;
    }
  }
  // Fetch records
  const records =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  // Count total records
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform,
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
// import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
// import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProfileSnapshots(props: {
//   seller: SellerPayload;
//   body: IShoppingMallSellerProfileSnapshot.IRequest;
// }): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
//     ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------