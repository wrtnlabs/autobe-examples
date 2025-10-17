import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const { seller, productId, body } = props;

  // 1. Find the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Authorization - only seller owner allowed
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // 3. If new category id provided, validate existence
  if (body.shopping_mall_category_id !== undefined) {
    const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: body.shopping_mall_category_id },
    });
    if (!category || category.deleted_at !== null) {
      throw new HttpException("Category not found", 404);
    }
  }

  // 4. If new seller id provided, validate existence
  if (body.shopping_mall_seller_id !== undefined) {
    const sellerCheck = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: body.shopping_mall_seller_id },
    });
    if (!sellerCheck || sellerCheck.deleted_at !== null) {
      throw new HttpException("Seller not found", 404);
    }
  }

  // 5. If code provided, check uniqueness
  if (body.code !== undefined) {
    const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        code: body.code,
        id: { not: productId },
      },
    });
    if (existing) {
      throw new HttpException("Product code already exists", 409);
    }
  }

  // 6. Update the product
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: productId },
    data: {
      shopping_mall_category_id: body.shopping_mall_category_id ?? undefined,
      shopping_mall_seller_id: body.shopping_mall_seller_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  // 7. Return updated product with proper date conversion
  return {
    id: updated.id,
    shopping_mall_category_id: updated.shopping_mall_category_id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
