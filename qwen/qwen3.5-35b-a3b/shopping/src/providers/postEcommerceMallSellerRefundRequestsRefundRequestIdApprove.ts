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
  await MyGlobal.prisma.$transaction(async (tx) => {
    const refundRequest =
      await tx.ecommerce_mall_refund_requests.findUniqueOrThrow({
        where: { id: props.refundRequestId },
        select: {
          id: true,
          ecommerce_mall_customer_id: true,
          ecommerce_mall_order_item_id: true,
          refund_code: true,
          status: true,
          reason: true,
          evidence_description: true,
          seller_response: true,
          rejection_reason: true,
          delivery_date: true,
          submitted_at: true,
          decision_at: true,
          processed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    if (refundRequest.status !== "pending") {
      throw new HttpException("Refund request already has a decision", 400);
    }
    const deliveryDate = refundRequest.delivery_date;
    const daysDifference =
      (new Date().getTime() - new Date(deliveryDate).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDifference > 7) {
      throw new HttpException(
        "Refund request expired (beyond 7 days from delivery)",
        400,
      );
    }
    const orderItem = await tx.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.ecommerce_mall_order_item_id },
      select: {
        id: true,
        variant_snapshot_id: true,
        seller_snapshot_id: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        ecommerce_mall_order_id: true,
        product_snapshot_id: true,
      },
    });
    const orderItemSnapshotId = orderItem.product_snapshot_id;
    if (!orderItemSnapshotId) {
      throw new HttpException("Forbidden", 403);
    }
    const product = await tx.ecommerce_mall_products.findUnique({
      where: { id: orderItemSnapshotId },
      select: { seller_id: true },
    });
    if (product === null || product.seller_id !== props.seller.id) {
      throw new HttpException("Forbidden", 403);
    }
    const refundRequestSnapshot =
      await tx.ecommerce_mall_refund_request_snapshots.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          refund_request_id: refundRequest.id,
          actor_type: "seller",
          action_type:
            props.body.action === "approve" ? "approved" : "rejected",
          status_before: refundRequest.status,
          status_after:
            props.body.action === "approve" ? "approved" : "rejected",
          reason_before: refundRequest.reason,
          reason_after: refundRequest.reason,
          response_before: refundRequest.seller_response,
          response_after:
            props.body.action === "reject" && props.body.rejection_reason
              ? props.body.rejection_reason
              : (refundRequest.seller_response ?? null),
          created_at: toISOStringSafe(new Date()),
        },
      });
    if (props.body.action === "approve") {
      const inventoryRecord = await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ecommerce_mall_product_variant_id: orderItem.variant_snapshot_id,
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          quantity_change: orderItem.quantity,
          remaining_quantity: 0,
          reason: "RETURN",
          type: "INCOMING",
          description: `Refund approved for refund request ${refundRequest.refund_code}`,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });
      await tx.ecommerce_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          updated_at: toISOStringSafe(new Date()),
        },
      });
      await tx.ecommerce_mall_refund_requests.update({
        where: { id: refundRequest.id },
        data: {
          status: "approved",
          seller_response: "Refund approved",
          decision_at: toISOStringSafe(new Date()),
          processed_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      await tx.ecommerce_mall_refund_request_snapshot_of_sellers.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          refund_request_snapshot_id: refundRequestSnapshot.id,
          seller_id: props.seller.id,
          seller_session_id: props.seller.session_id,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      const allItemsRefunded = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          deleted_at: null,
        },
        select: { id: true },
      });
      const allItems = await tx.ecommerce_mall_order_items.findMany({
        where: {
          ecommerce_mall_order_id: orderItem.ecommerce_mall_order_id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (allItemsRefunded.length === allItems.length) {
        await tx.ecommerce_mall_orders.update({
          where: { id: orderItem.ecommerce_mall_order_id },
          data: {
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    } else {
      await tx.ecommerce_mall_refund_requests.update({
        where: { id: refundRequest.id },
        data: {
          status: "rejected",
          rejection_reason: props.body.rejection_reason ?? null,
          decision_at: toISOStringSafe(new Date()),
          seller_response: "Refund rejected",
          updated_at: toISOStringSafe(new Date()),
        },
      });
      await tx.ecommerce_mall_refund_request_snapshot_of_sellers.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          refund_request_snapshot_id: refundRequestSnapshot.id,
          seller_id: props.seller.id,
          seller_session_id: props.seller.session_id,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  });
  const updatedRefundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...EcommerceMallRefundRequestTransformer.select(),
    });
  return await EcommerceMallRefundRequestTransformer.transform(
    updatedRefundRequest,
  );
}
