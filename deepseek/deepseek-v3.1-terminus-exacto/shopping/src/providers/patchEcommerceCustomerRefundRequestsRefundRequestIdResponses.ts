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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerRefundRequestsRefundRequestIdResponses(props: {
  customer: CustomerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IResponse;
}): Promise<IEcommerceRefundRequest> {
  // Import the transformer (already shown in loaded context)
  const {
    EcommerceRefundRequestTransformer,
  } = require("../transformers/EcommerceRefundRequestTransformer");
  // First, find the refund request and verify it belongs to this customer
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: {
        id: typia.assert<string & tags.Format<"uuid">>(props.refundRequestId),
      },
      select: {
        id: true,
        ecommerce_customer_id: true,
        ecommerce_seller_id: true,
        ecommerce_order_item_id: true,
        requested_at: true,
        refund_window_expires_at: true,
        reason: true,
        deleted_at: true,
      },
    });
  // Verify customer owns this refund request
  if (refundRequest.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: This refund request does not belong to you",
      403,
    );
  }
  // Check refund window hasn't expired (using ISO string comparison)
  const now = toISOStringSafe(new Date());
  const refundWindowExpiresAt = toISOStringSafe(
    refundRequest.refund_window_expires_at,
  );
  if (refundWindowExpiresAt < now) {
    throw new HttpException("Refund window has expired", 400);
  }
  // Check if already soft-deleted
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has been deleted", 400);
  }
  // Check for existing response (customer should only respond once)
  const existingResponse =
    await MyGlobal.prisma.ecommerce_refund_response_records.findFirst({
      where: {
        ecommerce_refund_request_id: typia.assert<string & tags.Format<"uuid">>(
          props.refundRequestId,
        ),
      },
    });
  if (existingResponse) {
    throw new HttpException(
      "A response to this refund request already exists",
      400,
    );
  }
  // First, verify the order item is delivered (business rule)
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: refundRequest.ecommerce_order_item_id },
      select: { status: true },
    });
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund can only be requested for delivered items",
      400,
    );
  }
  // Create refund response record
  const responseId = v4();
  await MyGlobal.prisma.ecommerce_refund_response_records.create({
    data: {
      id: typia.assert<string & tags.Format<"uuid">>(responseId),
      ecommerce_refund_request_id: typia.assert<string & tags.Format<"uuid">>(
        props.refundRequestId,
      ),
      ecommerce_seller_id: props.customer.id,
      decision: "customer_responded",
      response_reason: props.body.reason ?? "",
      responded_at: new Date(now),
      created_at: new Date(now),
      updated_at: new Date(now),
    },
  });
  // Update the refund request with customer's response
  await MyGlobal.prisma.ecommerce_refund_requests.update({
    where: {
      id: typia.assert<string & tags.Format<"uuid">>(props.refundRequestId),
    },
    data: {
      // Update relevant fields from body
      updated_at: new Date(now),
    },
  });
  // Return the updated refund request using transformer
  const updated =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: {
        id: typia.assert<string & tags.Format<"uuid">>(props.refundRequestId),
      },
      ...EcommerceRefundRequestTransformer.select(),
    });
  return await EcommerceRefundRequestTransformer.transform(updated);
}
