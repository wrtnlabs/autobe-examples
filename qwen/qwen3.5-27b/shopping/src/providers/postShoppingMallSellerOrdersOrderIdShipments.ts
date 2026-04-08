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
import { ShoppingMallShipmentCollector } from "../collectors/ShoppingMallShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.ICreate;
}): Promise<IShoppingMallShipment> {
  // Validate carrier_name is provided and non-empty
  if (!props.body.carrier_name || props.body.carrier_name.trim() === "") {
    throw new HttpException("carrier_name is required", 400);
  }
  // Validate tracking_number is provided and non-empty
  if (!props.body.tracking_number || props.body.tracking_number.trim() === "") {
    throw new HttpException("tracking_number is required", 400);
  }
  // Execute transaction for atomic shipment creation and order item updates
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify order exists and is not deleted
    await tx.shopping_mall_orders.findUniqueOrThrow({
      where: { id: props.orderId, deleted_at: null },
    });
    // Fetch order items to validate
    const orderItems = await tx.shopping_mall_order_items.findMany({
      where: {
        id: { in: props.body.order_item_ids },
        deleted_at: null,
      },
    });
    // Check if all order items exist
    if (orderItems.length !== props.body.order_item_ids.length) {
      throw new HttpException("One or more order items not found", 404);
    }
    // Check if all order items belong to the authenticated seller
    const notOwnedItems = orderItems.filter(
      (item) => item.shopping_mall_seller_id !== props.seller.id,
    );
    if (notOwnedItems.length > 0) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if all order items belong to the specified order
    const notInOrder = orderItems.filter(
      (item) => item.shopping_mall_order_id !== props.orderId,
    );
    if (notInOrder.length > 0) {
      throw new HttpException(
        "One or more order items do not belong to the specified order",
        404,
      );
    }
    // Check if all order items have 'paid' status
    const unpaidItems = orderItems.filter((item) => item.status !== "paid");
    if (unpaidItems.length > 0) {
      throw new HttpException(
        "Order items must be in 'paid' status to be shipped",
        409,
      );
    }
    // Create shipment using collector
    const shipment = await tx.shopping_mall_shipments.create({
      data: await ShoppingMallShipmentCollector.collect({
        body: props.body,
        shoppingMallOrders: { id: props.orderId },
        shoppingMallSellers: { id: props.seller.id },
      }),
      ...ShoppingMallShipmentTransformer.select(),
    });
    // Update all order items to 'shipped' status
    await tx.shopping_mall_order_items.updateMany({
      where: { id: { in: props.body.order_item_ids } },
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
// export async function postShoppingMallSellerOrdersOrderIdShipments(props: {
//   seller: SellerPayload;
//   orderId: string & tags.Format<"uuid">;
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