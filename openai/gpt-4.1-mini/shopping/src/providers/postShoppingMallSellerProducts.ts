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

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { seller, body } = props;

  // Step 1: Check if product code is duplicated
  const duplicate = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      code: body.code,
    },
    select: { id: true },
  });
  if (duplicate !== null) {
    throw new HttpException("Conflict: Product code already exists", 409);
  }

  // Step 2: Validate shopping_mall_category_id existence and not deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      id: body.shopping_mall_category_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (category === null) {
    throw new HttpException(
      "Bad Request: Invalid or non-existent category ID",
      400,
    );
  }

  // Step 3: Validate shopping_mall_seller_id existence, active, and not deleted
  const sellerRecord = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: body.shopping_mall_seller_id,
      status: "active",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (sellerRecord === null) {
    throw new HttpException("Bad Request: Invalid or inactive seller ID", 400);
  }

  // Step 4: Create new product
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      shopping_mall_category_id: body.shopping_mall_category_id,
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 5: Return created product with correct date formatting
  return {
    id: created.id,
    shopping_mall_category_id: created.shopping_mall_category_id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
