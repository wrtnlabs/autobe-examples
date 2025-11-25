import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdCategoriesCategoryId(props: {
  seller: SellerPayload;
  productId: string;
  categoryId: string;
}): Promise<void> {
  // Verify product exists and is draft status
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  if (product.status !== "draft") {
    throw new HttpException(
      "Cannot modify categories of published products",
      403,
    );
  }

  // Verify seller owns the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "Forbidden: Product does not belong to seller",
      403,
    );
  }

  // Verify category exists
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      id: props.categoryId,
    },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  // Delete the association directly and validate deletion occurred
  const deleted = await MyGlobal.prisma.shopping_mall_product_categories.delete(
    {
      where: {
        shopping_mall_product_id_shopping_mall_category_id: {
          shopping_mall_product_id: props.productId,
          shopping_mall_category_id: props.categoryId,
        },
      },
    },
  );

  if (!deleted) {
    throw new HttpException("Product-category association not found", 404);
  }
}
