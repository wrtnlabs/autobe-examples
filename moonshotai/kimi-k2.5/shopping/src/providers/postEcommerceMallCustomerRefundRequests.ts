import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallRefundRequestCollector } from "../collectors/EcommerceMallRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallRefundRequest.ICreate;
}): Promise<IEcommerceMallRefundRequest> {
  // Find the order item and verify customer ownership via order
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.body.orderItemId },
      select: {
        id: true,
        status: true,
        order_id: true,
        order: {
          select: {
            customer_id: true,
          },
        },
      },
    });
  // Verify order item has status 'delivered'
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be delivered to request refund",
      422,
    );
  }
  // Verify customer owns the order containing this order item
  if (orderItem.order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if pending refund request already exists
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Pending refund request already exists for this order item",
      409,
    );
  }
  // Find delivery record via shipment to validate 7-day window
  const shipmentItem =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findFirst({
      where: {
        order_item_id: props.body.orderItemId,
      },
      select: {
        shipment: {
          select: {
            delivery: {
              select: {
                delivered_at: true,
              },
            },
          },
        },
      },
    });
  if (shipmentItem?.shipment?.delivery?.delivered_at === undefined) {
    throw new HttpException(
      "No delivery record found for this order item",
      422,
    );
  }
  // Validate 7-day window from delivery
  const deliveredAt = shipmentItem.shipment.delivery.delivered_at;
  const sevenDaysMs = 604800000;
  const deadlineTime = deliveredAt.getTime() + sevenDaysMs;
  if (Date.now() > deadlineTime) {
    throw new HttpException(
      "Refund request must be submitted within 7 days of delivery",
      422,
    );
  }
  // Create refund request using collector
  const created = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
    data: await EcommerceMallRefundRequestCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallOrderItems: { id: props.body.orderItemId },
    }),
    ...EcommerceMallRefundRequestTransformer.select(),
  });
  return await EcommerceMallRefundRequestTransformer.transform(created);
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
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerRefundRequests(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallRefundRequest.ICreate;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.create({
//     data: await EcommerceMallRefundRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallRefundRequestTransformer.select(),
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------