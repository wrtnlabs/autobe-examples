import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerSellersMeProfileSnapshots(props: {
  seller: SellerPayload;
}): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
  // Find seller profile by seller_id
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (sellerProfile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  // Pagination defaults
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  // Query snapshots with pagination
  const records =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
      where: {
        ecommerce_mall_seller_profile_id: sellerProfile.id,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.count({
      where: {
        ecommerce_mall_seller_profile_id: sellerProfile.id,
      },
    });
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  // Transform records to response DTOs
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
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
// import { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerSellersMeProfileSnapshots(props: {
//   seller: SellerPayload;
// }): Promise<IPageIEcommerceMallSellerProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_profile_snapshots.findMany({
//     ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------