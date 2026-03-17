import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // 1. Authorization - verify seller owns the product (and product is not deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
    },
    select: { id: true, shopping_mall_seller_id: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify variant exists and belongs to this product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (variant === null) {
    throw new HttpException("Variant not found", 404);
  }
  // 3. Check for pending orders or requests
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException("Cannot update variant with pending orders", 400);
  }
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: { shopping_mall_product_variant_id: props.variantId },
        status: "pending",
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot update variant with pending cancellation requests",
      400,
    );
  }
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: { shopping_mall_product_variant_id: props.variantId },
        status: "pending",
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot update variant with pending refund requests",
      400,
    );
  }
  // 4. SKU uniqueness check if changing
  if (
    props.body.skuCode !== undefined &&
    props.body.skuCode !== variant.sku_code
  ) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.skuCode,
          deleted_at: null,
          NOT: { id: props.variantId },
        },
      });
    if (existingSku !== null) {
      throw new HttpException("SKU code already exists", 400);
    }
  }
  // 5. Update variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.skuCode !== undefined && { sku_code: props.body.skuCode }),
      ...(props.body.optionValues !== undefined && {
        option_values: JSON.stringify(props.body.optionValues),
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: new Date(),
    },
  });
  // 6. Return updated variant using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
