import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallCustomer> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!seller || seller.status !== "approved") {
    throw new HttpException("Seller not approved", 403);
  }
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      id: props.body.category_id,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Category not found", 400);
  }
  if (props.body.name.length < 1 || props.body.name.length > 100) {
    throw new HttpException("Product name must be 1-100 characters", 400);
  }
  if (
    props.body.description.length < 50 ||
    props.body.description.length > 1000
  ) {
    throw new HttpException(
      "Product description must be 50-1000 characters",
      400,
    );
  }
  if (props.body.base_price < 0.01) {
    throw new HttpException("Base price must be at least 0.01", 400);
  }
  if (
    !props.body.variants ||
    props.body.variants.length < 1 ||
    props.body.variants.length > 20
  ) {
    throw new HttpException("Product must have 1-20 variants", 400);
  }
  // Check for duplicate SKUs within this product creation
  const skuSet = new Set<string>();
  for (const variant of props.body.variants) {
    if (
      variant.sku_code.length < 3 ||
      variant.sku_code.length > 20 ||
      !/^[a-zA-Z0-9]+$/.test(variant.sku_code)
    ) {
      throw new HttpException(
        "SKU code must be 3-20 alphanumeric characters",
        400,
      );
    }
    if (skuSet.has(variant.sku_code)) {
      throw new HttpException("Duplicate SKU code detected", 409);
    }
    skuSet.add(variant.sku_code);
  }
  // Validate SKUs don't already exist in other products
  const existingSkus =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        sku_code: { in: props.body.variants.map((v) => v.sku_code) },
      },
    });
  if (existingSkus.length > 0) {
    throw new HttpException("SKU code already exists in another product", 409);
  }
  const createdProduct = await MyGlobal.prisma.shopping_mall_products.create({
    data: await ShoppingMallProductCollector.collect({
      body: props.body,
      shoppingMallSellers: { id: props.seller.id },
    }),
  });
  // Create product snapshot using direct field mapping
  const productImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { product_id: createdProduct.id },
    });
  const productVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { product_id: createdProduct.id },
    });
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      product_id: createdProduct.id,
      category_id: createdProduct.category_id,
      changed_by_id: createdProduct.seller_id,
      changed_at: toISOStringSafe(createdProduct.created_at),
      version: 1,
      images: {
        create: productImages.map((img) => ({
          image_url: img.image_url,
          position: img.position,
          created_at: toISOStringSafe(img.created_at),
        })),
      },
      variants: {
        create: productVariants.map((variant) => ({
          sku_code: variant.sku_code,
          price: variant.price,
          stock_quantity: variant.stock_quantity,
          created_at: toISOStringSafe(variant.created_at),
        })),
      },
    },
  });
  // Return IShoppingMallCustomer with complete required fields - updated_at not in database, so use created_at
  return {
    id: props.seller.id,
    email: seller.email,
    created_at: toISOStringSafe(seller.created_at),
    updated_at: toISOStringSafe(seller.created_at),
  };
}
