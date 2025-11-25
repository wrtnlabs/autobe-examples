import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdAttributesAttributeId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttribute> {
  // 1. Check that the attribute exists and is active
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

  // 2. Check for dependent mappings (active attribute value mappings referencing this attribute)
  const dependencyCount =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.count({
      where: {
        shopping_mall_product_attribute_id: props.attributeId,
      },
    });
  if (dependencyCount > 0) {
    throw new HttpException(
      "Cannot delete: Attribute is still used by one or more SKUs/attribute values.",
      409,
    );
  }

  // 3. Soft delete: set deleted_at to now (as ISO string, using toISOStringSafe)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_attributes.update(
    {
      where: { id: props.attributeId },
      data: { deleted_at: now, updated_at: now },
    },
  );

  // 4. Return IShoppingMallProductAttribute
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    attribute_name: updated.attribute_name,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
