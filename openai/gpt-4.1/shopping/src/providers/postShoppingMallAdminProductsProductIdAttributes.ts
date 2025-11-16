import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdAttributes(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.ICreate;
}): Promise<IShoppingMallProductAttribute> {
  // 1. Confirm product exists and is not soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found or has been deleted.", 404);
  }

  // 2. Ensure attribute_name is unique per product
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Attribute name already exists for this product.",
      409,
    );
  }

  // 3. Create new attribute
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_attributes.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        position: props.body.position,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // 4. Return per DTO
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    attribute_name: created.attribute_name,
    position: created.position,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
