import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductSnapshotImageAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductSnapshotsProductSnapshotIdImages(props: {
  seller: SellerPayload;
  productSnapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotImage.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotImage.ISummary> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: {
        id: props.productSnapshotId,
      },
      select: {
        id: true,
        product: {
          select: {
            sellerAccount: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
  if (snapshot.product.sellerAccount.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const current = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (current - 1) * limit;
  const where: Prisma.mall_platform_product_snapshot_imagesWhereInput = {
    mall_platform_product_snapshot_id: props.productSnapshotId,
    ...(props.body.search === undefined || props.body.search.length === 0
      ? {}
      : {
          image_uri: {
            contains: props.body.search,
          },
        }),
  };
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
      where,
      orderBy: {
        sort_order: "asc",
      },
      skip,
      take: limit,
      ...MallPlatformProductSnapshotImageAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.count({
      where,
    });
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductSnapshotImageAtSummaryTransformer.transform,
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
// import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
// import { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerProductSnapshotsProductSnapshotIdImages(props: {
//   seller: SellerPayload;
//   productSnapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductSnapshotImage.IRequest;
// }): Promise<IPageIMallPlatformProductSnapshotImage.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
//     ...MallPlatformProductSnapshotImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductSnapshotImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------