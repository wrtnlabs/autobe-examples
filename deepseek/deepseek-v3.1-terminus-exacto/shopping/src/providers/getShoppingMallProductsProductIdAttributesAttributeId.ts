import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";

export async function getShoppingMallProductsProductIdAttributesAttributeId(props: {
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttribute> {
  const attribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findUnique({
      where: {
        id: props.attributeId,
        shopping_mall_product_id: props.productId,
      },
    });

  if (!attribute) {
    throw new HttpException("Product attribute not found", 404);
  }

  return {
    id: attribute.id,
    shopping_mall_product_id: attribute.shopping_mall_product_id,
    attribute_name: attribute.attribute_name,
    attribute_value: attribute.attribute_value,
    display_order: attribute.display_order,
    created_at: toISOStringSafe(attribute.created_at),
    updated_at: toISOStringSafe(attribute.updated_at),
  };
}
