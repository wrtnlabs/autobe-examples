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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallSellerProfileSnapshotAtSummaryTransformer } from "../transformers/ECommerceMallSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorSellersSellerIdProfileSnapshots(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IECommerceMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIECommerceMallSellerProfileSnapshot.ISummary> {
  // 1. Resolve the seller profile
  const profile =
    await MyGlobal.prisma.e_commerce_mall_seller_profiles.findUnique({
      where: { e_commerce_mall_seller_id: props.sellerId },
      select: { id: true },
    });
  if (profile === null) {
    throw new HttpException("Seller profile not found", 404);
  }
  // 2. Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 3. Build where clause with optional date range filter
  const where: Prisma.e_commerce_mall_seller_profile_snapshotsWhereInput = {
    e_commerce_mall_seller_profile_id: profile.id,
  };
  if (props.body.created_at) {
    const created_at_filter: Prisma.DateTimeFilter = {};
    if (props.body.created_at.gte !== undefined) {
      created_at_filter.gte = props.body.created_at.gte;
    }
    if (props.body.created_at.lte !== undefined) {
      created_at_filter.lte = props.body.created_at.lte;
    }
    where.created_at = created_at_filter;
  }
  // 4. Query snapshots with pagination (sequential await)
  const snapshots =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.e_commerce_mall_seller_profile_snapshots.count({
      where,
    });
  // 5. Transform and return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      ECommerceMallSellerProfileSnapshotAtSummaryTransformer.transform,
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
// import { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
// import { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorSellersSellerIdProfileSnapshots(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
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