import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
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
  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { shopping_mall_seller_id: props.seller.id },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_profile_id: profile.id,
    ...(props.body.dateFrom !== undefined || props.body.dateTo !== undefined
      ? {
          created_at: {
            ...(props.body.dateFrom !== undefined && {
              gte: props.body.dateFrom,
            }),
            ...(props.body.dateTo !== undefined && { lte: props.body.dateTo }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_seller_profile_snapshotsWhereInput;
  const lastSort = props.body.sort?.slice(-1)[0];
  const orderByInput = (
    lastSort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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