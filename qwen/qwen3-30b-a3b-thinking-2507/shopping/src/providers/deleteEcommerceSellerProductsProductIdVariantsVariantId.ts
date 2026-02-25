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

export async function deleteEcommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if variant exists and belongs to specified product
  const variant = await MyGlobal.prisma.ecommerce_product_variants.findUnique({
    where: {
      id: props.variantId,
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Check for active order items referencing this variant
  const orderItems = await MyGlobal.prisma.ecommerce_order_items.findMany({
    where: {
      id: variant.id,
      deleted_at: null,
    },
  });
  if (orderItems.length > 0) {
    throw new HttpException(
      "Cannot delete variant with active order items",
      409,
    );
  }
  // Check for pending cancellation requests
  const cancellationRequests =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
      where: {
        id: variant.id,
      },
    });
  if (cancellationRequests.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const refundRequests =
    await MyGlobal.prisma.ecommerce_refund_requests.findMany({
      where: {
        id: variant.id,
      },
    });
  if (refundRequests.length > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Mark variant as deleted
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
