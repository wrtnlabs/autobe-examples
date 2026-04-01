import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminRefundRequestsRefundRequestId(props: {
  admin: AdminPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const { admin, refundRequestId, body } = props;
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequestId },
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        customer_reason: true,
        status: true,
        seller_comment: true,
        decisioned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (refundRequest.status === body.status) {
    return await ShoppingMallRefundRequestTransformer.transform({
      ...refundRequest,
      decisioned_at: refundRequest.decisioned_at
        ? toISOStringSafe(refundRequest.decisioned_at)
        : null,
    } as any);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request already decided", 400);
  }
  const willApprove = body.status === "approved";
  const select = ShoppingMallRefundRequestTransformer.select();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedRefundRequest = await tx.shopping_mall_refund_requests.update({
      where: { id: refundRequestId },
      data: {
        status: body.status,
        seller_comment:
          body.seller_comment === undefined
            ? refundRequest.seller_comment
            : body.seller_comment,
        decisioned_at:
          willApprove || body.status === "rejected" ? new Date() : null,
        updated_at: new Date(),
      },
      select: (select as any).select ?? select,
    });
    const orderItem = await tx.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        line_item_status: true,
        deleted_at: true,
      },
    });
    if (willApprove) {
      if (orderItem.line_item_status === "refunded") {
        return updatedRefundRequest;
      }
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          line_item_status: "refunded",
          updated_at: new Date(),
        },
      });
      const latest = await tx.shopping_mall_inventory_records.findFirst({
        where: {
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
        },
        orderBy: { created_at: "desc" },
        select: {
          stock_quantity: true,
          reserved_quantity: true,
          available_quantity: true,
        },
      });
      if (latest) {
        await tx.shopping_mall_inventory_records.create({
          data: {
            id: v4(),
            shopping_mall_product_variant_id:
              orderItem.shopping_mall_product_variant_id,
            stock_quantity: latest.stock_quantity + orderItem.quantity,
            reserved_quantity: latest.reserved_quantity + orderItem.quantity,
            available_quantity: latest.available_quantity + orderItem.quantity,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    } else {
      if (orderItem.line_item_status === "refunded") {
        throw new HttpException("Conflicting refund state", 400);
      }
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: {
          line_item_status: orderItem.line_item_status,
          updated_at: new Date(),
        },
      });
    }
    await tx.shopping_mall_snapshots.create({
      data: {
        id: v4(),
        snapshot_code: `refund_request_${refundRequestId}`,
        source_type: "refund_request",
        source_entity_id: refundRequestId,
        source_refund_request_id: refundRequestId,
        source_order_item_id: orderItem.id,
        source_seller_id: null,
        source_order_id: null,
        created_by_member_id: null,
        reason: "admin_refund_request_decision",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return await tx.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequestId },
      select: (select as any).select ?? select,
    });
  });
  return await ShoppingMallRefundRequestTransformer.transform(result as any);
}
