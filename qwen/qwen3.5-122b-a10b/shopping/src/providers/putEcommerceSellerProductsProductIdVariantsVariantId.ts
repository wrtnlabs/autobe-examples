import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductVariantTransformer } from "../transformers/EcommerceProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceProductVariant.IUpdate;
}): Promise<IEcommerceProductVariant> {
  // Verify variant exists and is active
  const variant =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { product_id: true, deleted_at: true },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant has been deleted", 404);
  }
  // Verify variant belongs to the specified product
  if (variant.product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  // Verify product is owned by the authenticated seller
  const product = await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { seller_id: true },
  });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException(
      "Product does not belong to the authenticated seller",
      403,
    );
  }
  // Check for pending order items (paid or shipped status)
  const pendingOrderItems = await MyGlobal.prisma.ecommerce_order_items.count({
    where: {
      productVariant: { id: props.variantId },
      deleted_at: null,
      status: { in: ["paid", "shipped"] },
    },
  });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot update variant with pending order items",
      400,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: {
        orderItem: {
          productVariant: { id: props.variantId },
        },
        deleted_at: null,
        status: "pending",
      },
    });
  // Check for pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_refund_requests.count({
      where: {
        orderItem: {
          productVariant: { id: props.variantId },
        },
        deleted_at: null,
        status: "pending",
      },
    });
  if (pendingCancellationRequests > 0 || pendingRefundRequests > 0) {
    throw new HttpException(
      "Cannot update variant with pending cancellation or refund requests",
      400,
    );
  }
  // Validate SKU uniqueness within the product if being updated
  if (props.body.sku_code !== undefined) {
    const existingVariant =
      await MyGlobal.prisma.ecommerce_product_variants.findFirst({
        where: {
          product_id: props.productId,
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
          deleted_at: null,
        },
      });
    if (existingVariant !== null) {
      throw new HttpException(
        "SKU code must be unique within the product",
        400,
      );
    }
  }
  // Update the variant
  await MyGlobal.prisma.ecommerce_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.option_values !== undefined && {
        option_values: props.body.option_values,
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  // Return the updated variant with all fields
  const updated =
    await MyGlobal.prisma.ecommerce_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...EcommerceProductVariantTransformer.select(),
    });
  return await EcommerceProductVariantTransformer.transform(updated);
}
