import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrderItemsItemIdProductSnapshotImages(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallOrderItemProductSnapshotImage.ISummary> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        productVariant: {
          select: {
            product: {
              select: {
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (
    orderItem.productVariant.product.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findUniqueOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        select: { id: true },
      },
    );
  const limit = Math.min(props.body.limit ?? 20, 100);
  const sort = props.body.sort ?? "display_order.asc";
  const page = Math.max(props.body.page ?? 1, 1);
  const orderBy =
    sort === "created_at.desc"
      ? { created_at: "desc" as const }
      : { display_order: "asc" as const };
  const whereInput: Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput =
    {
      shopping_mall_order_item_product_snapshot_id: productSnapshot.id,
    };
  if (props.body.cursor) {
    const cursorDate = Buffer.from(props.body.cursor, "base64").toString(
      "utf-8",
    );
    whereInput.created_at =
      sort === "created_at.desc"
        ? { lt: new Date(cursorDate) }
        : { gt: new Date(cursorDate) };
  }
  const skip = props.body.cursor ? undefined : (page - 1) * limit;
  const data =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findMany(
      {
        where: whereInput,
        orderBy,
        ...(skip !== undefined ? { skip, take: limit } : { take: limit }),
        ...ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.count(
      {
        where: {
          shopping_mall_order_item_product_snapshot_id: productSnapshot.id,
        },
      },
    );
  return {
    pagination: {
      current: props.body.cursor ? 1 : page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.transform,
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
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IPageIShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemProductSnapshotImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerOrderItemsItemIdProductSnapshotImages(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallOrderItemProductSnapshotImage.IRequest;
// }): Promise<IPageIShoppingMallOrderItemProductSnapshotImage.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findMany({
//     ...ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------