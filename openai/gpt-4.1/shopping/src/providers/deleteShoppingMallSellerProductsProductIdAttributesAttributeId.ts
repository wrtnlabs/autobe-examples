import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdAttributesAttributeId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttribute> {
  // 1. Fetch the attribute
  const attribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!attribute) {
    throw new HttpException("Attribute not found or already deleted.", 404);
  }
  // 2. Ensure seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException(
      "Forbidden: You do not have permission to modify this product.",
      403,
    );
  }
  // 3. Check for dependencies on this attribute
  const dependentValueCount =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.count({
      where: {
        shopping_mall_product_attribute_id: props.attributeId,
      },
    });
  if (dependentValueCount > 0) {
    throw new HttpException(
      "Cannot remove attribute: dependent attribute values exist.",
      409,
    );
  }
  // 4. Soft delete the attribute
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_attributes.update(
    {
      where: { id: props.attributeId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    },
  );
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    attribute_name: updated.attribute_name,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
