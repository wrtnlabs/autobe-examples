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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformSellerProfileSnapshotAtSummaryTransformer } from "../transformers/MallPlatformSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProfileSnapshots(props: {
  seller: SellerPayload;
  body: IMallPlatformSellerProfileSnapshot.IRequest;
}): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim()
    ? props.body.search
    : undefined;
  const order: "asc" | "desc" = props.body.order ?? "desc";
  const sort: string | undefined = props.body.sort;
  const sellerProfile =
    await MyGlobal.prisma.mall_platform_seller_profiles.findFirstOrThrow({
      where: {},
      select: {
        id: true,
      },
    });
  if (sort !== undefined && sort !== "createdAt" && sort !== "created_at") {
    throw new HttpException("Unsupported sort field", 400);
  }
  if (sort === undefined && order !== "desc") {
    throw new HttpException("Unsupported order without sort field", 400);
  }
  const where: Prisma.mall_platform_seller_profile_snapshotsWhereInput = {
    seller_profile_id: sellerProfile.id,
    ...(search === undefined
      ? {}
      : {
          OR: [
            {
              shop_name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              shop_description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              logo_image_uri: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
  };
  const records =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: order,
      },
      ...MallPlatformSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const recordsCount: number =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
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
// export async function patchMallPlatformSellerProfileSnapshots(props: {
//   seller: SellerPayload;
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