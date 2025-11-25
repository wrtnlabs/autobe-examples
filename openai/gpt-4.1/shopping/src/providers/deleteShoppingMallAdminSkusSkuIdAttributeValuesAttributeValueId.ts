import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSkusSkuIdAttributeValuesAttributeValueId(props: {
  admin: AdminPayload;
  skuId: string & tags.Format<"uuid">;
  attributeValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttributeValue> {
  // 1. Find the attribute value mapping and verify it belongs to skuId
  const mapping =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findUnique({
      where: { id: props.attributeValueId },
    });
  if (!mapping || mapping.shopping_mall_product_sku_id !== props.skuId) {
    throw new HttpException(
      "Attribute value mapping not found for given SKU",
      404,
    );
  }
  // 2. Delete the mapping
  const deleted =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.delete({
      where: { id: props.attributeValueId },
    });
  // 3. Return the deleted record as DTO
  return {
    id: deleted.id,
    shopping_mall_product_sku_id: deleted.shopping_mall_product_sku_id,
    shopping_mall_product_attribute_id:
      deleted.shopping_mall_product_attribute_id,
    value_display_name: deleted.value_display_name,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
  };
}
