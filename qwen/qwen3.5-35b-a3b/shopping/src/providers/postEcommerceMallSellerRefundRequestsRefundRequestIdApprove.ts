import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerRefundRequestsRefundRequestIdApprove(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallRefundRequest.IApproval;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  if (refundRequest.status !== "pending_approval") {
    throw new HttpException(
      "Refund request is not in pending approval state",
      400,
    );
  }
  const deliveryDate = refundRequest.delivery_date;
  const now = new Date();
  const daysSinceDelivery =
    (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    throw new HttpException(
      "Refund request is outside 7-day delivery window",
      400,
    );
  }
  const orderItem = refundRequest.orderItem;
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.sellerSnapshot.id !== props.seller.id) {
    throw new HttpException(
      "Seller is not authorized to approve this refund request",
      403,
    );
  }
  const decisionAt = new Date();
  if (props.body.action === "approve") {
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refund_request_id: props.refundRequestId,
        action_type: props.body.action,
        actor_type: "seller",
        created_at: decisionAt,
      },
    });
    await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "approved",
        decision_at: decisionAt,
        seller_response: "Refund approved",
        updated_at: decisionAt,
      },
    });
    await MyGlobal.prisma.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id: orderItem.variantSnapshot.id,
        quantity_change: orderItem.quantity,
        reason: "refund",
        type: "adjustment",
        remaining_quantity: 0,
        updated_at: decisionAt,
        created_at: decisionAt,
      },
    });
    const updatedRequest =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        ...EcommerceMallRefundRequestTransformer.select(),
      });
    return await EcommerceMallRefundRequestTransformer.transform(
      updatedRequest,
    );
  }
  if (props.body.action === "reject") {
    await MyGlobal.prisma.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        refund_request_id: props.refundRequestId,
        action_type: props.body.action,
        actor_type: "seller",
        created_at: decisionAt,
      },
    });
    await MyGlobal.prisma.ecommerce_mall_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: "rejected",
        decision_at: decisionAt,
        rejection_reason: props.body.rejection_reason ?? null,
        seller_response: "Refund rejected",
        updated_at: decisionAt,
      },
    });
    const updatedRequest =
      await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        ...EcommerceMallRefundRequestTransformer.select(),
      });
    return await EcommerceMallRefundRequestTransformer.transform(
      updatedRequest,
    );
  }
  throw new HttpException("Invalid action", 400);
}
