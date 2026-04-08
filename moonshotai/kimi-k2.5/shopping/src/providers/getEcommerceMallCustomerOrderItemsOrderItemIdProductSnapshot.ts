import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemProductSnapshotTransformer } from "../transformers/EcommerceMallOrderItemProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrderItemsOrderItemIdProductSnapshot(props: {
  customer: CustomerPayload;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemProductSnapshot> {
  // Verify the order item belongs to the customer
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  // Retrieve the product snapshot with images using the transformer
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
        where: {
          ecommerce_mall_order_item_id: props.orderItemId,
        },
      },
    );
  return await EcommerceMallOrderItemProductSnapshotTransformer.transform(
    record,
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
// import { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
// import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerOrderItemsOrderItemIdProductSnapshot(props: {
//   customer: CustomerPayload;
//   orderItemId: string;
// }): Promise<IEcommerceMallOrderItemProductSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_product_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemProductSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemProductSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------