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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemsItemIdProductSnapshotImages(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallOrderItemProductSnapshotImage.ISummary> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        order: {
          select: { shopping_mall_customer_id: true },
        },
      },
    });
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findUniqueOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        select: { id: true },
      },
    );
  const sort: "display_order.asc" | "created_at.desc" =
    props.body.sort ?? "display_order.asc";
  const limit: number = Math.min(props.body.limit ?? 20, 100);
  const baseWhere: Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput =
    {
      shopping_mall_order_item_product_snapshot_id: productSnapshot.id,
    };
  let cursorFilter: Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput =
    {};
  if (props.body.cursor) {
    const raw: string = Buffer.from(props.body.cursor, "base64").toString(
      "utf-8",
    );
    if (sort === "display_order.asc") {
      const cursorValue: number = parseInt(raw, 10);
      cursorFilter = { display_order: { gt: cursorValue } };
    } else {
      cursorFilter = { created_at: { lt: raw } };
    }
  }
  const orderBy: Prisma.shopping_mall_order_item_product_snapshot_imagesOrderByWithRelationInput[] =
    sort === "display_order.asc"
      ? [{ display_order: "asc" }]
      : [{ created_at: "desc" }];
  const page: number = props.body.page ?? 1;
  const skip: number | undefined = props.body.cursor
    ? undefined
    : (page - 1) * limit;
  const where: Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput =
    {
      ...baseWhere,
      ...cursorFilter,
    };
  const findManyArgs: Prisma.shopping_mall_order_item_product_snapshot_imagesFindManyArgs =
    {
      where,
      ...ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.select(),
      orderBy,
      take: limit,
      ...(skip !== undefined ? { skip } : {}),
    };
  const records =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findMany(
      findManyArgs,
    );
  const total: number =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.count(
      {
        where: baseWhere,
      },
    );
  const data = await ArrayUtil.asyncMap(
    records.map((record) => ({
      id: record.id,
      created_at: record.created_at,
      display_order: record.display_order,
      image_url: record.image_url,
      productSnapshot: { id: productSnapshot.id },
    })),
    ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.transform,
  );
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const result: IPageIShoppingMallOrderItemProductSnapshotImage.ISummary = {
    data,
    pagination,
  };
  return result;
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
// export async function patchShoppingMallCustomerOrderItemsItemIdProductSnapshotImages(props: {
//   customer: CustomerPayload;
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