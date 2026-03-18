import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallRefundRequestTransformer } from "../transformers/ShoppingMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorOrderItemsOrderItemIdRefundRequest(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.IProcess;
}): Promise<IShoppingMallRefundRequest> {
  if (props.body.decision !== "approve" && props.body.decision !== "reject")
    throw new HttpException("Bad Request", 400);
  const timestamp: string & tags.Format<"date-time"> =
    new globalThis.Date().toISOString();
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const orderItem = await prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        quantity: true,
        status: true,
        refunded_at: true,
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                seller: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        refundRequests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    if (orderItem.productVariant.product.seller.id !== props.administrator.id)
      throw new HttpException("Forbidden", 403);
    if (orderItem.refunded_at !== null)
      throw new HttpException("Conflict", 409);
    if (orderItem.refundRequests.length === 0)
      throw new HttpException("Not Found", 404);
    const refundRequest = orderItem.refundRequests[0];
    if (refundRequest.status !== "pending")
      throw new HttpException("Conflict", 409);
    const reviewedReason = props.body.reviewedReason ?? null;
    await prisma.shopping_mall_refund_requests.update({
      where: { id: refundRequest.id },
      data: {
        status: props.body.decision === "approve" ? "approved" : "rejected",
        reviewed_at: timestamp,
        reviewed_reason: reviewedReason,
        updated_at: timestamp,
      },
    });
    if (props.body.decision === "approve") {
      await prisma.shopping_mall_order_items.update({
        where: { id: props.orderItemId },
        data: {
          status: "refunded",
          refunded_at: timestamp,
          updated_at: timestamp,
        },
      });
      await prisma.shopping_mall_inventory_records.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: orderItem.productVariant.id,
          quantity_change: orderItem.quantity,
          reason: "refund-restoration",
          occurred_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        },
      });
    }
    const updated =
      await prisma.shopping_mall_refund_requests.findUniqueOrThrow({
        where: { id: refundRequest.id },
        ...ShoppingMallRefundRequestTransformer.select(),
      });
    return await ShoppingMallRefundRequestTransformer.transform(updated);
  });
}
