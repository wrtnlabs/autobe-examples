import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductSnapshotImageAtSummaryTransformer } from "../transformers/MallPlatformProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdImages(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotImage.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotImage.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        mall_platform_product_id: true,
      },
    });
  if (snapshot.mall_platform_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const records =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.findMany({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
        ...(props.body.search === undefined || props.body.search === ""
          ? {}
          : {
              image_uri: {
                contains: props.body.search,
                mode: "insensitive",
              },
            }),
      } satisfies Prisma.mall_platform_product_snapshot_imagesWhereInput,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { sort_order: props.body.order ?? "asc" },
      ...MallPlatformProductSnapshotImageAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.mall_platform_product_snapshot_images.count({
      where: {
        mall_platform_product_snapshot_id: props.snapshotId,
        ...(props.body.search === undefined || props.body.search === ""
          ? {}
          : {
              image_uri: {
                contains: props.body.search,
                mode: "insensitive",
              },
            }),
      } satisfies Prisma.mall_platform_product_snapshot_imagesWhereInput,
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
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdImages(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
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