import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
      seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        product_id: props.productId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
      take: 1,
    });
  if (pendingOrderItems.length > 0) {
    throw new HttpException(
      "Cannot delete product with pending paid or shipped order items",
      409,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        orderItem: {
          product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: {
        id: true,
      },
      take: 1,
    });
  if (pendingCancellations.length > 0) {
    throw new HttpException(
      "Cannot delete product with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        orderItem: {
          product_id: props.productId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: {
        id: true,
      },
      take: 1,
    });
  if (pendingRefunds.length > 0) {
    throw new HttpException(
      "Cannot delete product with pending refund requests",
      409,
    );
  }
  // Soft delete the product
  await MyGlobal.prisma.ecommerce_mall_products.update({
    where: {
      id: props.productId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
