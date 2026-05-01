import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemProductSnapshotTransformer } from "../transformers/ShoppingMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemsItemIdProductSnapshot(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemProductSnapshot> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        where: { shopping_mall_order_item_id: props.itemId },
        ...ShoppingMallOrderItemProductSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallOrderItemProductSnapshotTransformer.transform(
    snapshot,
  );
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
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerOrderItemsItemIdProductSnapshot(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemProductSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_product_snapshots.findFirstOrThrow({
//     ...ShoppingMallOrderItemProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------