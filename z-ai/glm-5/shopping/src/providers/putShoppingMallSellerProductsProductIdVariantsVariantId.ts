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

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Fetch product with variant, category, seller, and images
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      shopping_mall_category_id: true,
      name: true,
      description: true,
      base_price: true,
      deleted_at: true,
      images: {
        select: { image_url: true, display_order: true },
        orderBy: { display_order: "asc" as const },
      } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
      variants: {
        where: { deleted_at: null },
        select: {
          id: true,
          sku_code: true,
          option_values: true,
          price: true,
          created_at: true,
        },
      } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Verify ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the specific variant
  const variant = product.variants.find((v) => v.id === props.variantId);
  if (variant === undefined) {
    throw new HttpException("Variant not found", 404);
  }
  // Check for pending order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot update variant with pending order items",
      400,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot update variant with pending cancellation requests",
      400,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_variant_id: props.variantId,
        },
        status: "pending",
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot update variant with pending refund requests",
      400,
    );
  }
  // If SKU code is being changed, check for uniqueness
  if (
    props.body.sku_code !== undefined &&
    props.body.sku_code !== variant.sku_code
  ) {
    const existingSku =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
        },
        select: { id: true },
      });
    if (existingSku !== null) {
      throw new HttpException("SKU code already exists", 409);
    }
  }
  // Calculate current stock for each variant (for snapshot)
  const variantStocks =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["variant_id"],
      where: {
        variant_id: {
          in: product.variants.map((v) => v.id),
        },
      },
      _sum: { quantity_change: true },
    });
  const stockMap = new Map(
    variantStocks.map((r) => [r.variant_id, r._sum?.quantity_change ?? 0]),
  );
  // Create product snapshot before update
  const now = new Date();
  const snapshot = await MyGlobal.prisma.shopping_mall_product_snapshots.create(
    {
      data: {
        id: v4(),
        shopping_mall_product_id: product.id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        images: JSON.stringify(product.images.map((img) => img.image_url)),
        created_at: now,
      },
    },
  );
  // Create SKU snapshots for all variants (before update)
  await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.createMany({
    data: product.variants.map((v) => ({
      id: v4(),
      shopping_mall_product_snapshot_id: snapshot.id,
      sku_code: v.sku_code,
      option_values: v.option_values,
      price: v.price,
      stock_quantity: stockMap.get(v.id) ?? 0,
      created_at: now,
    })),
  });
  // Update the variant
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      ...(props.body.sku_code !== undefined && {
        sku_code: props.body.sku_code,
      }),
      ...(props.body.option_values !== undefined && {
        option_values: JSON.stringify(props.body.option_values),
      }),
      ...(props.body.price !== undefined && { price: props.body.price }),
      updated_at: now,
    },
  });
  // Fetch and return updated variant using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return await ShoppingMallProductVariantTransformer.transform(updated);
}
