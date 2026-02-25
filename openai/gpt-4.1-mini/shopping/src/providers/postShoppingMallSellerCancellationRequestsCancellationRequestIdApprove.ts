import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdApprove(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestId },
        include: {
          orderItem: {
            select: {
              id: true,
              quantity: true,
              shopping_mall_product_variant_id: true,
              productVariant: { select: { id: true } },
            },
          },
          customer: { select: { id: true } },
        },
      },
    );
  if (cancellationRequest.seller_approval_status !== "pending") {
    throw new HttpException(
      "Cancellation request is not pending approval",
      400,
    );
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const resultRaw = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        seller_approval_status: "approved",
        processed_at: now,
        updated_at: now,
      },
    });
    await tx.shopping_mall_order_items.update({
      where: { id: cancellationRequest.shopping_mall_order_item_id },
      data: { status: "cancelled", updated_at: now },
    });
    await tx.shopping_mall_product_variants.update({
      where: {
        id: cancellationRequest.orderItem.shopping_mall_product_variant_id,
      },
      data: {
        stock_quantity: { increment: cancellationRequest.orderItem.quantity },
        updated_at: now,
      },
    });
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_cancellation_request_id: props.cancellationRequestId,
        seller_approval_status: "approved",
        seller_approval_reason: null,
        processed_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    return await tx.shopping_mall_cancellation_requests.findUniqueOrThrow({
      where: { id: props.cancellationRequestId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
          },
        },
        orderItem: {
          select: {
            id: true,
            quantity: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                product: { select: { id: true } },
                inventoryHistories: { select: { id: true } },
              },
            },
            order: {
              select: {
                id: true,
                order_number: true,
                total_price: true,
                total_quantity: true,
                order_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                customer: {
                  select: {
                    id: true,
                    email: true,
                    display_name: true,
                    phone_number: true,
                    created_at: true,
                    updated_at: true,
                  },
                },
              },
            },
          },
        },
        seller_approval_status: true,
        seller_approval_reason: true,
        requested_at: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  function convertDatesToStrings<T>(obj: any): T {
    if (obj === null || typeof obj !== "object") return obj;
    const copy: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      const val = obj[key];
      if (val instanceof Date) {
        copy[key] = toISOStringSafe(val);
      } else if (typeof val === "object" && val !== null) {
        copy[key] = convertDatesToStrings(val);
      } else {
        copy[key] = val;
      }
    }
    return copy;
  }
  const result =
    convertDatesToStrings<IShoppingMallCancellationRequest>(resultRaw);
  return await ShoppingMallCancellationRequestTransformer.transform(result);
}
