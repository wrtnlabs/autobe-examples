import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceRefundRequestCollector } from "../collectors/EcommerceRefundRequestCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEcommerceCustomerRefundRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceRefundRequest.ICreate;
}): Promise<IEcommerceRefundRequest> {
  // Validate order item exists and belongs to customer
  const orderItemDetails =
    await MyGlobal.prisma.ecommerce_order_items.findFirst({
      where: {
        id: props.body.orderItemId,
        order: { customer_id: props.customer.id },
      },
      include: {
        seller: { select: { id: true } },
        order: { select: { id: true, customer_id: true } },
      },
    });
  if (!orderItemDetails) {
    throw new HttpException(
      "Order item not found or does not belong to you",
      404,
    );
  }
  // Check if order item has 'delivered' status
  if (orderItemDetails.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // Check delivery confirmation exists - need to find via shipment that contains this order item
  const deliveryConfirmation =
    await MyGlobal.prisma.ecommerce_delivery_confirmations.findFirst({
      where: {
        shipment: {
          shipmentItems: {
            some: {
              orderItem: { id: props.body.orderItemId },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  if (!deliveryConfirmation) {
    throw new HttpException(
      "Delivery confirmation not found for this order item",
      400,
    );
  }
  // Check 7-day refund window from delivery
  const deliveryDate = new Date(deliveryConfirmation.created_at);
  const refundWindowExpires = new Date(
    deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  if (now > refundWindowExpires) {
    throw new HttpException(
      "Refund window has expired - requests must be made within 7 days of delivery",
      400,
    );
  }
  // Check for existing active refund requests
  const existingRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findFirst({
      where: {
        orderItem: { id: props.body.orderItemId },
      },
    });
  if (existingRequest) {
    throw new HttpException(
      "An active refund request already exists for this order item",
      400,
    );
  }
  // Create the refund request
  const refundRequestData = await EcommerceRefundRequestCollector.collect({
    body: props.body,
    ecommerceCustomers: { id: props.customer.id },
    ecommerceCustomerSessions: { id: props.customer.session_id },
  });
  // Create the refund request record
  const created = await MyGlobal.prisma.ecommerce_refund_requests.create({
    data: refundRequestData,
    ...EcommerceRefundRequestTransformer.select(),
  });
  // Create initial 'pending' status
  await MyGlobal.prisma.ecommerce_refund_request_statuses.create({
    data: {
      id: v4(),
      refundRequest: { connect: { id: created.id } },
      status: "pending",
      created_at: new Date(),
    },
  });
  return await EcommerceRefundRequestTransformer.transform(created);
}
