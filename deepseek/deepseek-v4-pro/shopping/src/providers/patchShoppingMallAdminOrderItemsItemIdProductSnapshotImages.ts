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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminOrderItemsItemIdProductSnapshotImages(props: {
  admin: AdminPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemProductSnapshotImage.IRequest;
}): Promise<IPageIShoppingMallOrderItemProductSnapshotImage.ISummary> {
  await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
    where: { id: props.itemId },
  });
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
      },
    );
  const limit: number = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const sort: "display_order.asc" | "created_at.desc" =
    props.body.sort ?? "display_order.asc";
  const page: number = (props.body.page ?? 1) < 1 ? 1 : (props.body.page ?? 1);
  const baseWhere = {
    shopping_mall_order_item_product_snapshot_id: productSnapshot.id,
  } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput;
  let queryWhere: Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput =
    { ...baseWhere };
  let skip: number = (page - 1) * limit;
  const cursorRaw: string | undefined = props.body.cursor;
  if (cursorRaw !== undefined && cursorRaw !== null) {
    const decoded: string = Buffer.from(cursorRaw, "base64").toString("utf-8");
    const separatorIndex: number = decoded.lastIndexOf("||");
    const cursorValue: string = decoded.substring(0, separatorIndex);
    const cursorId: string = decoded.substring(separatorIndex + 2);
    skip = 0;
    if (sort === "display_order.asc") {
      const displayOrder: number = parseInt(cursorValue, 10);
      queryWhere = {
        ...baseWhere,
        OR: [
          { display_order: { gt: displayOrder } },
          { display_order: displayOrder, id: { gt: cursorId } },
        ],
      } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput;
    } else {
      queryWhere = {
        ...baseWhere,
        OR: [
          { created_at: { lt: cursorValue } },
          { created_at: cursorValue, id: { lt: cursorId } },
        ],
      } satisfies Prisma.shopping_mall_order_item_product_snapshot_imagesWhereInput;
    }
  }
  const orderBy: Prisma.shopping_mall_order_item_product_snapshot_imagesOrderByWithRelationInput[] =
    sort === "display_order.asc"
      ? [{ display_order: "asc" }, { id: "asc" }]
      : [{ created_at: "desc" }, { id: "desc" }];
  const records =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.findMany(
      {
        where: queryWhere,
        orderBy,
        skip,
        take: limit,
        ...ShoppingMallOrderItemProductSnapshotImageAtSummaryTransformer.select(),
      },
    );
  const total: number =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshot_images.count(
      {
        where: baseWhere,
      },
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
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
// export async function patchShoppingMallAdminOrderItemsItemIdProductSnapshotImages(props: {
//   admin: AdminPayload;
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