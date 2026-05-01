import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: { shopping_mall_product_id: true },
    });
  if (snapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const hasDisplayOrderFilter =
    props.body.display_order_min !== undefined ||
    props.body.display_order_max !== undefined;
  const whereInput = {
    shopping_mall_product_snapshot_id: props.snapshotId,
    ...(hasDisplayOrderFilter
      ? {
          display_order: {
            ...(props.body.display_order_min !== undefined && {
              gte: props.body.display_order_min,
            }),
            ...(props.body.display_order_max !== undefined && {
              lte: props.body.display_order_max,
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_product_snapshot_imagesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
      where: whereInput,
      ...ShoppingMallProductSnapshotImageAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.count({
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
      data,
      ShoppingMallProductSnapshotImageAtSummaryTransformer.transform,
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
// import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
// import { IPageIShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductSnapshotImage.IRequest;
// }): Promise<IPageIShoppingMallProductSnapshotImage.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_snapshot_images.findMany({
//     ...ShoppingMallProductSnapshotImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductSnapshotImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------