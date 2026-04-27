import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/ECommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallCustomerOrderItemsItemIdSellerSnapshot(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallOrderItemSellerSnapshot> {
  // Verify the order item exists and belongs to this customer
  // Chain: order_items → orders → customers
  await MyGlobal.prisma.e_commerce_mall_order_items.findFirstOrThrow({
    where: {
      id: props.itemId,
      order: {
        customer: {
          id: props.customer.id,
        },
      },
    },
    select: { id: true },
  });
  // Query the seller snapshot using the 1:1 FK constraint
  const snapshot =
    await MyGlobal.prisma.e_commerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        where: { e_commerce_mall_order_item_id: props.itemId },
        ...ECommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await ECommerceMallOrderItemSellerSnapshotTransformer.transform(
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
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallCustomerOrderItemsItemIdSellerSnapshot(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallOrderItemSellerSnapshot> {
//   const record = await MyGlobal.prisma.e_commerce_mall_order_item_seller_snapshots.findFirstOrThrow({
//     ...ECommerceMallOrderItemSellerSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallOrderItemSellerSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------