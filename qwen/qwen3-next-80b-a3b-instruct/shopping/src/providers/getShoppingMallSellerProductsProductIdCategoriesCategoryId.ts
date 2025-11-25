import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerProductsProductIdCategoriesCategoryId(props: {
  seller: SellerPayload;
  productId: string;
  categoryId: string;
}): Promise<IShoppingMallProductCategory.IInvert> {
  // Verify product belongs to seller and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }

  // Verify category exists and is active
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      is_active: true,
    },
  });

  if (!category) {
    throw new HttpException("Category not found or inactive", 404);
  }

  // Find specific product-category association
  const association =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        shopping_mall_category_id: props.categoryId,
      },
    });

  if (!association) {
    throw new HttpException("Product is not assigned to this category", 404);
  }

  // Return the association ID as IInvert (string type)
  return association.id;
}
