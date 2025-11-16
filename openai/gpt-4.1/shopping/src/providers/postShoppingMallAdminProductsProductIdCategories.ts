import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdCategories(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductsCategory.ICreate;
}): Promise<IShoppingMallProductsCategory> {
  // Step 1: Validate product existence (not soft-deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }

  // Step 2: Validate category existence (not soft-deleted)
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { id: props.body.shopping_mall_category_id },
  });
  if (!category || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }

  // Step 3: Ensure mapping does not already exist
  const existingMapping =
    await MyGlobal.prisma.shopping_mall_products_categories.findUnique({
      where: {
        shopping_mall_product_id_shopping_mall_category_id: {
          shopping_mall_product_id: props.productId,
          shopping_mall_category_id: props.body.shopping_mall_category_id,
        },
      },
    });
  if (existingMapping) {
    throw new HttpException(
      "This category is already assigned to this product",
      409,
    );
  }

  // Step 4: Get seller summary for product's seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: product.shopping_mall_seller_id },
    select: { id: true, business_name: true },
  });
  if (!seller) {
    throw new HttpException("Product owner (seller) not found", 500);
  }

  // Step 5: Insert mapping
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_products_categories.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        shopping_mall_category_id: props.body.shopping_mall_category_id,
        created_at: now,
      },
    });

  // Step 6: Compose result
  return {
    id: created.id,
    product: {
      id: product.id,
      title: product.title,
      default_price: product.default_price,
      business_status: product.business_status,
      seller: {
        id: seller.id,
        business_name: seller.business_name,
      },
      categories: [],
      created_at: toISOStringSafe(product.created_at),
    },
    category: {
      id: category.id,
      name: category.name,
      description: category.description,
      status: category.status,
      sort_order: category.sort_order,
      updated_at: toISOStringSafe(category.updated_at),
      deleted_at: category.deleted_at
        ? toISOStringSafe(category.deleted_at)
        : null,
    },
    created_at: toISOStringSafe(created.created_at),
  };
}
