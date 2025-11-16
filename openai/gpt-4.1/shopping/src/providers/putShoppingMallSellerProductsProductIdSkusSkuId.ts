import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdSkusSkuId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSku.IUpdate;
}): Promise<IShoppingMallProductSku> {
  // 1. Check product existence and ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: not the product owner", 403);
  }
  if (
    product.business_status === "archived" ||
    product.business_status === "blocked"
  ) {
    throw new HttpException("Product is deleted or archived", 400);
  }

  // 2. Check SKU existence and linkage
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: {
      id: props.skuId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found for this product", 404);
  }

  // 3. Optional: If updating sku_code, check uniqueness for this product
  if (props.body.sku_code && props.body.sku_code !== sku.sku_code) {
    const dup = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        sku_code: props.body.sku_code,
        deleted_at: null,
      },
    });
    if (dup) {
      throw new HttpException("Duplicate sku_code within this product", 409);
    }
  }

  // 4. Prepare update fields
  const updateFields: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (typeof props.body.sku_code === "string")
    updateFields.sku_code = props.body.sku_code;
  if (typeof props.body.price === "number")
    updateFields.price = props.body.price;
  if (typeof props.body.stock === "number")
    updateFields.stock = props.body.stock;
  if (typeof props.body.status === "string")
    updateFields.status = props.body.status;

  // 5. Run update (allow partial/no updates, but update updated_at)
  const updated = await MyGlobal.prisma.shopping_mall_product_skus.update({
    where: { id: props.skuId },
    data: updateFields,
  });

  // 6. Compose IShoppingMallProductSku result (product summary, seller summary, categories)
  // Get minimal seller info
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
    select: { id: true, business_name: true },
  });
  // Get categories (join table)
  const mappings =
    await MyGlobal.prisma.shopping_mall_products_categories.findMany({
      where: { shopping_mall_product_id: product.id },
      select: { shopping_mall_category_id: true },
    });
  // Normally, we'd need shopping_mall_categories for .name; we return empty list due to unavailable schema

  const productSummary = {
    id: product.id,
    title: product.title,
    default_price: product.default_price,
    business_status: product.business_status,
    seller: seller ?? {
      id: product.shopping_mall_seller_id,
      business_name: "",
    },
    categories: [], // Category names not loaded; would require shopping_mall_categories
    created_at: toISOStringSafe(product.created_at),
  };

  return {
    id: updated.id,
    product: productSummary,
    sku_code: updated.sku_code,
    price: updated.price,
    stock: updated.stock,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
