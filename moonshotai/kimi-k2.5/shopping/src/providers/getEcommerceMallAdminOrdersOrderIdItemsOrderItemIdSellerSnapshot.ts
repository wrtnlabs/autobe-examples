import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/EcommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
  admin: AdminPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallOrderItemSellerSnapshot> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.orderItemId,
        ecommerce_mall_order_id: props.orderId,
      },
      select: {
        ecommerce_mall_order_item_seller_snapshot_id: true,
      },
    });
  const record =
    await MyGlobal.prisma.ecommerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        ...EcommerceMallOrderItemSellerSnapshotTransformer.select(),
        where: {
          id: orderItem.ecommerce_mall_order_item_seller_snapshot_id,
        },
      },
    );
  return await EcommerceMallOrderItemSellerSnapshotTransformer.transform(
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
// import { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminOrdersOrderIdItemsOrderItemIdSellerSnapshot(props: {
//   admin: AdminPayload;
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