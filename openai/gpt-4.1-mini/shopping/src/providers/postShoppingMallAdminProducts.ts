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

export async function postShoppingMallAdminProducts(props: {
  admin: AdminPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { admin, body } = props;

  // Check for duplicate product code
  const existingProduct =
    await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: { code: body.code, deleted_at: null },
      select: { id: true },
    });
  if (existingProduct !== null) {
    throw new HttpException(`Product code '${body.code}' already exists`, 409);
  }

  // Verify category exists and not deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: { id: body.shopping_mall_category_id, deleted_at: null },
    select: { id: true },
  });
  if (category === null) {
    throw new HttpException(
      `Category ID '${body.shopping_mall_category_id}' not found`,
      404,
    );
  }

  // Verify seller exists and not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: body.shopping_mall_seller_id, deleted_at: null },
    select: { id: true },
  });
  if (seller === null) {
    throw new HttpException(
      `Seller ID '${body.shopping_mall_seller_id}' not found`,
      404,
    );
  }

  // Prepare data to create
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id,
      shopping_mall_category_id: body.shopping_mall_category_id,
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

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
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
