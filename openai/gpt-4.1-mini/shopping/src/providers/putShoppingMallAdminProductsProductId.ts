import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const { admin, productId, body } = props;

  // Step 1: Validate product existence
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new HttpException(`Product not found: ${productId}`, 404);
  }

  // Step 2: Validate category existence if category_id is provided
  if (
    body.shopping_mall_category_id !== undefined &&
    body.shopping_mall_category_id !== null
  ) {
    const categoryExists =
      await MyGlobal.prisma.shopping_mall_categories.findUnique({
        where: { id: body.shopping_mall_category_id },
      });
    if (!categoryExists) {
      throw new HttpException(
        `Category not found: ${body.shopping_mall_category_id}`,
        404,
      );
    }
  }

  // Step 3: Validate seller existence if seller_id is provided
  if (
    body.shopping_mall_seller_id !== undefined &&
    body.shopping_mall_seller_id !== null
  ) {
    const sellerExists = await MyGlobal.prisma.shopping_mall_sellers.findUnique(
      {
        where: { id: body.shopping_mall_seller_id },
      },
    );
    if (!sellerExists) {
      throw new HttpException(
        `Seller not found: ${body.shopping_mall_seller_id}`,
        404,
      );
    }
  }

  // Step 4: Validate code uniqueness if code provided and changed
  if (
    body.code !== undefined &&
    body.code !== product.code &&
    body.code !== null
  ) {
    const existingCode = await MyGlobal.prisma.shopping_mall_products.findFirst(
      {
        where: {
          code: body.code,
          NOT: { id: productId },
        },
      },
    );
    if (existingCode) {
      throw new HttpException(`Product code already exists: ${body.code}`, 409);
    }
  }

  // Step 5: Prepare update data
  const now = toISOStringSafe(new Date());

  const updatedProduct = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: productId },
    data: {
      shopping_mall_category_id:
        body.shopping_mall_category_id === null
          ? undefined
          : (body.shopping_mall_category_id ?? undefined),
      shopping_mall_seller_id:
        body.shopping_mall_seller_id === null
          ? undefined
          : (body.shopping_mall_seller_id ?? undefined),
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_category_id: true,
      shopping_mall_seller_id: true,
      code: true,
      name: true,
      description: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updatedProduct.id,
    shopping_mall_category_id: updatedProduct.shopping_mall_category_id,
    shopping_mall_seller_id: updatedProduct.shopping_mall_seller_id,
    code: updatedProduct.code,
    name: updatedProduct.name,
    description: updatedProduct.description ?? null,
    status: updatedProduct.status,
    created_at: toISOStringSafe(updatedProduct.created_at),
    updated_at: toISOStringSafe(updatedProduct.updated_at),
    deleted_at: updatedProduct.deleted_at
      ? toISOStringSafe(updatedProduct.deleted_at)
      : null,
  };
}
