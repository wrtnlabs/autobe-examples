import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformSnapshotSellerProfileAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IEcommercePlatformSnapshotSellerProfile.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotSellerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.max(1, Math.min(props.body.limit ?? 20, 100));
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_platform_snapshot_seller_profilesWhereInput = {
    ecommercePlatformSnapshots: {
      entity_type: "seller_profile",
      ...(props.body.startDate || props.body.endDate
        ? {
            created_at: {
              ...(props.body.startDate && { gte: props.body.startDate }),
              ...(props.body.endDate && { lte: props.body.endDate }),
            },
          }
        : {}),
    },
    ...(props.body.seller_profile_id && {
      ecommerce_platform_seller_profiles_id: props.body.seller_profile_id,
    }),
    ...(props.body.search && {
      OR: [
        { previous_shop_name: { contains: props.body.search } },
        { current_shop_name: { contains: props.body.search } },
        { previous_shop_description: { contains: props.body.search } },
        { current_shop_description: { contains: props.body.search } },
        { previous_logo_uri: { contains: props.body.search } },
        { current_logo_uri: { contains: props.body.search } },
      ],
    }),
  };
  const records =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.count({
      where,
    });
  return {
    data: await Promise.all(
      records.map((record) =>
        EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.transform(
          record,
        ),
      ),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommercePlatformSnapshotSellerProfile.ISummary;
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
// import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
// import { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerProfileSnapshots(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformSnapshotSellerProfile.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotSellerProfile.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findMany({
//     ...EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------