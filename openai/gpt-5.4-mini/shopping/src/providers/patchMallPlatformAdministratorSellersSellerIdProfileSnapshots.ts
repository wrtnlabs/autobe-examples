import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerProfileSnapshotAtSummaryTransformer } from "../transformers/MallPlatformSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellersSellerIdProfileSnapshots(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerProfileSnapshot.IRequest;
}): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
  const sellerProfile =
    await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
      where: {
        seller_account_id: props.sellerId,
      },
      select: {
        id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_seller_profile_snapshotsWhereInput = {
    seller_profile_id: sellerProfile.id,
    ...(props.body.search === undefined || props.body.search.length === 0
      ? {}
      : {
          OR: [
            {
              shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
    ...(props.body.createdAtFrom === undefined &&
    props.body.createdAtTo === undefined
      ? {}
      : {
          created_at: {
            ...(props.body.createdAtFrom === undefined
              ? {}
              : { gte: props.body.createdAtFrom }),
            ...(props.body.createdAtTo === undefined
              ? {}
              : { lte: props.body.createdAtTo }),
          },
        }),
  };
  const orderBy =
    props.body.sort === "created_at_asc" || props.body.sort === "createdAtAsc"
      ? ({
          created_at: "asc",
        } satisfies Prisma.mall_platform_seller_profile_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.mall_platform_seller_profile_snapshotsOrderByWithRelationInput);
  const records =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformSellerProfileSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
// import { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorSellersSellerIdProfileSnapshots(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IMallPlatformSellerProfileSnapshot.IRequest;
// }): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
//     ...MallPlatformSellerProfileSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformSellerProfileSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------