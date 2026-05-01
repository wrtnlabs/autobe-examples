import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentTransformer } from "../transformers/ShoppingMallShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallShipment> {
  // 1. Lookup shipment with order ownership info
  const shipment = await MyGlobal.prisma.shopping_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      delivered_at: true,
      order: {
        select: {
          shopping_mall_customer_id: true,
        },
      },
    },
  });
  // 2. 404 — shipment not found
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  // 3. 403 — ownership check
  if (shipment.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. 409 — already delivered
  if (shipment.delivered_at !== null) {
    throw new HttpException(
      "Delivery has already been confirmed for this shipment",
      409,
    );
  }
  // 5. 422 — verify all order items are in "shipped" status
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_shipment_id: props.shipmentId,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (orderItems.length === 0) {
    throw new HttpException(
      "No order items are associated with this shipment",
      422,
    );
  }
  const nonShippedItems = orderItems.filter(
    (item) => item.status !== "shipped",
  );
  if (nonShippedItems.length > 0) {
    throw new HttpException(
      "Cannot confirm delivery: not all items are in 'shipped' status",
      422,
    );
  }
  // 6. Transaction — update shipment and all associated order items
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_shipments.update({
      where: { id: props.shipmentId },
      data: {
        delivered_at: new Date(),
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_order_items.updateMany({
      where: {
        shopping_mall_shipment_id: props.shipmentId,
      },
      data: {
        status: "delivered",
        updated_at: new Date(),
      },
    });
  });
  // 7. Re-fetch updated shipment and return transformed response
  const updated =
    await MyGlobal.prisma.shopping_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      ...ShoppingMallShipmentTransformer.select(),
    });
  return await ShoppingMallShipmentTransformer.transform(updated);
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
// import { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
// import { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
// import { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
// import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
// import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerShipmentsShipmentIdConfirmDelivery(props: {
//   customer: CustomerPayload;
//   shipmentId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallShipment> {
//   const record = await MyGlobal.prisma.shopping_mall_shipments.findFirstOrThrow({
//     ...ShoppingMallShipmentTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------