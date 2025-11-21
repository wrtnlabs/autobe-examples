import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdAttributesAttributeId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the attribute exists and belongs to the specified product
  const attribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!attribute) {
    throw new HttpException("Product attribute not found", 404);
  }

  // Perform hard delete (no soft delete since this is permanent removal)
  await MyGlobal.prisma.shopping_mall_product_attributes.delete({
    where: {
      id: props.attributeId,
    },
  });
}
