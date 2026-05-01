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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProfilesProfileIdSnapshots(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
    where: { id: props.profileId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortArr = props.body.sort ?? [];
  const lastSort = sortArr[sortArr.length - 1];
  const sortDirection = lastSort === "created_at_asc" ? "asc" : "desc";
  const fromDate = props.body.dateFrom;
  const toDate = props.body.dateTo;
  const whereInput = {
    shopping_mall_seller_profile_id: props.profileId,
    ...(fromDate !== undefined || toDate !== undefined
      ? {
          created_at: {
            ...(fromDate !== undefined ? { gte: fromDate } : {}),
            ...(toDate !== undefined ? { lte: toDate } : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_seller_profile_snapshotsWhereInput;
  const orderByInput = {
    created_at: sortDirection,
  } satisfies Prisma.shopping_mall_seller_profile_snapshotsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      where: whereInput,
      ...ShoppingMallSellerProfileSnapshotAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: orderByInput,
    });
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
    } satisfies IPage.IPagination,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminProfilesProfileIdSnapshots(props: {
//   admin: AdminPayload;
//   profileId: string & tags.Format<"uuid">;
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