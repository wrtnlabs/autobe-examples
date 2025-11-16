import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";

export async function getShoppingMallSkusSkuIdAttributeValuesAttributeValueId(props: {
  skuId: string & tags.Format<"uuid">;
  attributeValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttributeValue> {
  const mapping =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findFirst({
      where: {
        id: props.attributeValueId,
        shopping_mall_product_sku_id: props.skuId,
      },
    });

  if (!mapping) {
    throw new HttpException(
      "Attribute value mapping not found for this SKU.",
      404,
    );
  }

  return {
    id: mapping.id,
    shopping_mall_product_sku_id: mapping.shopping_mall_product_sku_id,
    shopping_mall_product_attribute_id:
      mapping.shopping_mall_product_attribute_id,
    value_display_name: mapping.value_display_name,
    created_at: toISOStringSafe(mapping.created_at),
    updated_at: toISOStringSafe(mapping.updated_at),
  };
}
