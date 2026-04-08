import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderItemSnapshotTransformer } from "../transformers/ShoppingMallOrderItemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrderItemSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItemSnapshot> {
  // First, verify the snapshot exists and get the order item ID
  const snapshot =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findFirst({
      where: {
        id: props.snapshotId,
      },
      select: {
        shopping_mall_order_item_id: true,
      },
    });
  if (snapshot === null) {
    throw new HttpException("Order item snapshot not found", 404);
  }
  // Verify authorization: check that the order item belongs to an order placed by the customer
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: snapshot.shopping_mall_order_item_id,
      order: {
        shopping_mall_customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the complete snapshot with all related data
  const record =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      ...ShoppingMallOrderItemSnapshotTransformer.select(),
    });
  return await ShoppingMallOrderItemSnapshotTransformer.transform(record);
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
// import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
// import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
// import { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerOrderItemSnapshotsSnapshotId(props: {
//   customer: CustomerPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallOrderItemSnapshot> {
//   const record = await MyGlobal.prisma.shopping_mall_order_item_snapshots.findFirstOrThrow({
//     ...ShoppingMallOrderItemSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallOrderItemSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------