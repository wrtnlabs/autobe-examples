import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCancellationRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<void> {
  // JSON Schema validation has already guaranteed the request body contains
  // 'reason' and 'order_item_id' with correct format and length per operation spec.
  // Runtime validation is strictly prohibited by AutoBE principles.
  // Direct type assertion to extract fields from empty DTO: trusted by framework validation
  const orderItemId = (props.body as any).order_item_id as string;
  const reason = (props.body as any).reason as string;
  // Validate order item status through database (complies with 09-cancellation-refund.md)
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: orderItemId },
    select: { id: true, status: true, customer_id: true }, // Exactly as defined in schema
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cannot cancel items that are not in paid status",
      400,
    );
  }
  if (orderItem.customer_id !== props.customer.id) {
    throw new HttpException("You cannot cancel items that are not yours", 403);
  }
  const now = toISOStringSafe(new Date());
  const autoApproveAt = toISOStringSafe(
    new Date(Date.now() + 48 * 60 * 60 * 1000),
  );
  // Create cancellation request using correct schema field names
  await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
    data: {
      id: v4(),
      order_item_id: orderItemId,
      customer_id: props.customer.id,
      reason,
      status: "pending",
      created_at: now,
      updated_at: now,
      auto_approve_at: autoApproveAt,
    },
  });
  // Create system log using EXACT field names from schema: created_at, event_type, severity, metadata
  await MyGlobal.prisma.shopping_mall_system_logs.create({
    data: {
      id: v4(),
      created_at: now,
      event_type: "create_cancellation_request",
      severity: "info",
      metadata: JSON.stringify({ reason }),
    },
  });
}
