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

export async function patchMallPlatformSellerSellersSellerIdProfileSnapshots(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerProfileSnapshot.IRequest;
}): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    seller_profile_id: props.sellerId,
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
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
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at:
            props.body.createdAtFrom !== undefined &&
            props.body.createdAtTo !== undefined
              ? {
                  gte: props.body.createdAtFrom,
                  lte: props.body.createdAtTo,
                }
              : props.body.createdAtFrom !== undefined
                ? {
                    gte: props.body.createdAtFrom,
                  }
                : {
                    lte: props.body.createdAtTo,
                  },
        }
      : {}),
  } satisfies Prisma.mall_platform_seller_profile_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        sellerProfile: {
          select: {
            id: true,
          },
        },
      },
    });
  const records =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchMallPlatformSellerSellersSellerIdProfileSnapshots(props: {
//   seller: SellerPayload;
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