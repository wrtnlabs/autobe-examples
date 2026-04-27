import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchECommerceMallSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IECommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIECommerceMallSellerProfileSnapshot.ISummary> {
  // Resolve the seller profile ID (1:1 relationship via @@unique on e_commerce_mall_seller_id)
  const profile =
    await MyGlobal.prisma.e_commerce_mall_seller_profiles.findUnique({
      where: { e_commerce_mall_seller_id: props.seller.id },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  // Graceful: return empty page if seller has no profile
  if (profile === null) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    } satisfies IPageIECommerceMallSellerProfileSnapshot.ISummary;
  }
  const skip = (page - 1) * limit;
  // Build where clause with ownership filter and optional date range
  const whereInput: Prisma.e_commerce_mall_seller_profile_snapshotsWhereInput =
    {
      e_commerce_mall_seller_profile_id: profile.id,
      ...(props.body.created_at?.gte !== undefined
        ? { created_at: { gte: props.body.created_at.gte } }
        : {}),
      ...(props.body.created_at?.lte !== undefined
        ? { created_at: { lte: props.body.created_at.lte } }
        : {}),
    };
  const records =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallSellerProfileSnapshot.ISummary;
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
// import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
// import { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallSellerProfileSnapshots(props: {
//   seller: SellerPayload;
//   body: IECommerceMallSellerProfileSnapshot.IRequest;
// }): Promise<IPageIECommerceMallSellerProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findMany({
//     ...ECommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallSellerProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------