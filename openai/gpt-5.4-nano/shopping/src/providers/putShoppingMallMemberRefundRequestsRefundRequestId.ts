import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberRefundRequestsRefundRequestId(props: {
  member: MemberPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
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
  if (refundRequest === null || refundRequest.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // authorization: seller is decision maker: verify order item seller matches member id through product variant->product->seller
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        line_item_status: true,
        deleted_at: true,
        shopping_mall_shipment_id: true,
        placed_at: true,
        created_at: true,
        updated_at: true,
        seller_snapshot: { select: { source_seller_id: true, id: true } },
      },
    } as any);
  // derive seller id from sellerSnapshot? field name unknown
  const sellerId = (orderItem as any).seller_snapshot?.source_seller_id;
  if (sellerId === undefined || sellerId !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // validate customer_reason non-empty and equals? require keep present
  if (props.body.customer_reason.trim().length === 0) {
    throw new HttpException("customer_reason is required", 400);
  }
  // decisionedAt
  const decisionedAtValue =
    props.body.decisioned_at === undefined || props.body.decisioned_at === null
      ? null
      : props.body.decisioned_at;
  await MyGlobal.prisma.$transaction(async (tx) => {
    // update refund request
    const updateData: any = {
      customer_reason: props.body.customer_reason,
      status: props.body.status,
      updated_at: new Date(),
      seller_comment:
        props.body.seller_comment === undefined
          ? refundRequest.seller_comment
          : props.body.seller_comment === undefined
            ? null
            : props.body.seller_comment,
      decisioned_at:
        props.body.decisioned_at === undefined
          ? refundRequest.decisioned_at
          : props.body.decisioned_at === null
            ? null
            : props.body.decisioned_at
              ? new Date()
              : new Date(),
    };
    if (props.body.status === "approved") {
      updateData.decisioned_at = new Date();
      await tx.shopping_mall_order_items.update({
        where: { id: orderItem.id },
        data: { line_item_status: "refunded", updated_at: new Date() },
      });
      await tx.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id:
            orderItem.shopping_mall_product_variant_id,
          stock_quantity: orderItem.quantity,
          reserved_quantity: 0,
          available_quantity: orderItem.quantity,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    } else {
      updateData.decisioned_at = new Date();
    }
    await tx.shopping_mall_refund_requests.update({
      where: { id: refundRequest.id },
      data: updateData,
    });
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: refundRequest.id },
      select: ShoppingMallRefundRequestTransformer.select().select,
    });
  return await ShoppingMallRefundRequestTransformer.transform(updated as any);
}
