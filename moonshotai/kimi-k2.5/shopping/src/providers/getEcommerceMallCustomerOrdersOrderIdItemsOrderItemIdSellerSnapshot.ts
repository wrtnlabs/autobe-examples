import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
  customer: CustomerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  // Verify the order item belongs to the customer's order
  await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.orderItemId,
      ecommerce_mall_order_id: props.orderId,
      order: {
        ecommerce_mall_customer_id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  // Retrieve the seller snapshot for this order item
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findUniqueOrThrow(
      {
        where: {
          ecommerce_mall_order_item_id: props.orderItemId,
        },
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
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
// import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
//   customer: CustomerPayload;
//   orderId: string;
//   orderItemId: string;
// }): Promise<IEcommerceMallOrderItemSellerSnapshot> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow({
//     ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------