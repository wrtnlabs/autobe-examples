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

export async function deleteEcommerceMallSellerVariantsVariantIdOptionsOptionId(props: {
  seller: SellerPayload;
  variantId: string;
  optionId: string;
}): Promise<void> {
  // Verify variant exists and belongs to seller
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            id: true,
            seller_id: true,
          },
        },
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify option exists and belongs to this variant
  const option =
    await MyGlobal.prisma.ecommerce_mall_product_variant_options.findUnique({
      where: { id: props.optionId },
      select: {
        id: true,
        product_variant_id: true,
      },
    });
  if (option === null) {
    throw new HttpException("Option not found", 404);
  }
  if (option.product_variant_id !== props.variantId) {
    throw new HttpException("Option does not belong to this variant", 404);
  }
  // Check blocking condition 1: Order items with paid or shipped status
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
      where: {
        variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingOrderItems !== null) {
    throw new HttpException(
      "Cannot delete option: variant has pending order items with paid or shipped status",
      409,
    );
  }
  // Check blocking condition 2: Pending cancellation requests
  const pendingCancellation =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findFirst({
      where: {
        orderItem: {
          variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingCancellation !== null) {
    throw new HttpException(
      "Cannot delete option: variant has pending cancellation requests",
      409,
    );
  }
  // Check blocking condition 3: Pending refund requests
  const pendingRefund =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirst({
      where: {
        orderItem: {
          variant_id: props.variantId,
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingRefund !== null) {
    throw new HttpException(
      "Cannot delete option: variant has pending refund requests",
      409,
    );
  }
  // Hard delete the option
  await MyGlobal.prisma.ecommerce_mall_product_variant_options.delete({
    where: { id: props.optionId },
  });
}
