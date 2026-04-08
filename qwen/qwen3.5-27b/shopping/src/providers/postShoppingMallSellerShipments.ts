import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerShipments(props: {
  seller: SellerPayload;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  const orderItemIds = props.body.order_item_ids;
  // Query all order items to validate existence, seller ownership, and status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      id: { in: orderItemIds },
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      shopping_mall_order_id: true,
      status: true,
    },
  });
  // Validate all requested items were found
  if (orderItems.length !== orderItemIds.length) {
    throw new HttpException("One or more order items not found", 404);
  }
  // Validate all items belong to the authenticated seller
  const nonSellerItems = orderItems.filter(
    (item) => item.shopping_mall_seller_id !== props.seller.id,
  );
  if (nonSellerItems.length > 0) {
    throw new HttpException("You can only ship your own order items", 403);
  }
  // Validate all items have 'paid' status
  const nonPaidItems = orderItems.filter((item) => item.status !== "paid");
  if (nonPaidItems.length > 0) {
    throw new HttpException(
      "All order items must be in 'paid' status to be shipped",
      400,
    );
  }
  // Get order_id from body or first item
  const orderId = props.body.order_id ?? orderItems[0].shopping_mall_order_id;
  // Validate all items belong to the same order (if order_id provided)
  if (props.body.order_id) {
    const itemsFromDifferentOrder = orderItems.filter(
      (item) => item.shopping_mall_order_id !== orderId,
    );
    if (itemsFromDifferentOrder.length > 0) {
      throw new HttpException(
        "All order items must belong to the specified order",
        400,
      );
    }
  }
  // Verify order exists and is not deleted
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Execute transaction: create shipment and update order items
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create shipment
    const shipment = await tx.shopping_mall_shipments.create({
      data: {
        id: v4(),
        carrier_name: props.body.carrier_name,
        tracking_number: props.body.tracking_number,
        created_at: new Date(),
        updated_at: new Date(),
        delivered_at: null,
        deleted_at: null,
        order: { connect: { id: orderId } },
        seller: { connect: { id: props.seller.id } },
      },
      ...ShoppingMallShipmentTransformer.select(),
    });
    // Update all order items to 'shipped' status
    await tx.shopping_mall_order_items.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        status: "shipped",
        updated_at: new Date(),
      },
    });
    return shipment;
  });
  return await ShoppingMallShipmentTransformer.transform(record);
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
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerShipments(props: {
//   seller: SellerPayload;
//   body: IShoppingMallShipment.ICreate;
// }): Promise<IShoppingMallShipment> {
//   const record = await MyGlobal.prisma.shopping_mall_shipments.create({
//     data: await ShoppingMallShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallShipmentTransformer.select(),
//   });
//   return await ShoppingMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------