import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IUpdate;
}): Promise<IShoppingMallRefundRequest> {
  const now = toISOStringSafe(new Date());
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (
    !refundRequest ||
    refundRequest.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_refund_requests.update({
    where: { id: props.refundRequestId },
    data: {
      status: props.body.status,
      seller_response_reason: props.body.sellerResponseReason ?? null,
      responded_at: new Date(),
      updated_at: new Date(),
    },
  });
  const fullRefundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      include: {
        customer: true,
        seller: true,
        orderItem: {
          include: {
            refundRequests: true,
            order: { include: { customer: true } },
            productVariant: true,
          },
        },
      },
    });
  if (!fullRefundRequest) {
    throw new HttpException("Not Found after update", 404);
  }
  const toNullableIsoString = (date: Date | null | undefined): string | null =>
    date ? toISOStringSafe(date) : null;
  const convertCustomer = (
    c: typeof fullRefundRequest.customer,
  ): IShoppingMallCustomer.ISummary => ({
    id: c.id,
    email: c.email,
    createdAt: toISOStringSafe(c.created_at),
    updatedAt: toISOStringSafe(c.updated_at),
    displayName: c.display_name ?? null,
    phoneNumber: c.phone_number ?? null,
  });
  const convertSeller = (
    s: typeof fullRefundRequest.seller,
  ): IShoppingMallSeller.ISummary => ({
    id: s.id,
    email: s.email,
    shopName: s.shop_name,
    shopDescription: s.shop_description ?? null,
    logoUri: s.logo_uri ?? null,
    approvalStatus: s.approval_status,
    rejectionReason: s.rejection_reason ?? null,
  });
  const convertOrderCustomer = (
    c: typeof fullRefundRequest.orderItem.order.customer,
  ): IShoppingMallCustomer.ISummary => ({
    id: c.id,
    email: c.email,
    createdAt: toISOStringSafe(c.created_at),
    updatedAt: toISOStringSafe(c.updated_at),
    displayName: c.display_name ?? null,
    phoneNumber: c.phone_number ?? null,
  });
  const convertOrder = (
    o: typeof fullRefundRequest.orderItem.order,
  ): IShoppingMallOrder.ISummary => ({
    id: o.id,
    orderNumber: o.order_number,
    orderStatus: o.order_status,
    totalPrice: o.total_price,
    totalQuantity: o.total_quantity,
    createdAt: toISOStringSafe(o.created_at),
    updatedAt: toISOStringSafe(o.updated_at),
    customer: convertOrderCustomer(o.customer),
  });
  const convertProductVariant = (
    v: typeof fullRefundRequest.orderItem.productVariant,
  ): IShoppingMallProductVariant.ISummary => ({
    id: v.id,
    skuCode: v.sku_code,
    priceOverride: v.price_override,
    stockQuantity: v.stock_quantity,
    createdAt: toISOStringSafe(v.created_at),
    updatedAt: toISOStringSafe(v.updated_at),
  });
  const convertOrderItem = (
    oi: typeof fullRefundRequest.orderItem,
  ): IShoppingMallOrderItem.ISummary => ({
    id: oi.id,
    quantity: oi.quantity,
    status: typia.assert<
      "paid" | "shipped" | "delivered" | "cancelled" | "refunded"
    >(oi.status),
    createdAt: toISOStringSafe(oi.created_at),
    updatedAt: toISOStringSafe(oi.updated_at),
    refundRequests: (oi.refundRequests ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      sellerResponseReason: r.seller_response_reason ?? null,
      requestedAt: toISOStringSafe(r.requested_at),
      respondedAt: toNullableIsoString(r.responded_at),
      requestReason: r.request_reason,
      shoppingMallCustomerId: r.shopping_mall_customer_id,
      shoppingMallOrderItemId: r.shopping_mall_order_item_id,
      shoppingMallSellerId: r.shopping_mall_seller_id,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
    })),
    order: convertOrder(oi.order),
    productVariant: convertProductVariant(oi.productVariant),
  });
  const converted: IShoppingMallRefundRequest = {
    id: fullRefundRequest.id,
    status: fullRefundRequest.status,
    requestReason: fullRefundRequest.request_reason,
    sellerResponseReason: fullRefundRequest.seller_response_reason ?? null,
    createdAt: toISOStringSafe(fullRefundRequest.created_at),
    updatedAt: toISOStringSafe(fullRefundRequest.updated_at),
    deletedAt: toNullableIsoString(fullRefundRequest.deleted_at),
    requestedAt: toISOStringSafe(fullRefundRequest.requested_at),
    respondedAt: toNullableIsoString(fullRefundRequest.responded_at),
    shoppingMallOrderItem: convertOrderItem(fullRefundRequest.orderItem),
    shoppingMallCustomer: convertCustomer(fullRefundRequest.customer),
    shoppingMallSeller: convertSeller(fullRefundRequest.seller),
  };
  return await ShoppingMallRefundRequestTransformer.transform(converted);
}
