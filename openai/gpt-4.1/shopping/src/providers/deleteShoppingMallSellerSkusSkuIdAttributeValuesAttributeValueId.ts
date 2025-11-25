import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSkusSkuIdAttributeValuesAttributeValueId(props: {
  seller: SellerPayload;
  skuId: string & tags.Format<"uuid">;
  attributeValueId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttributeValue> {
  // Fetch the attribute value mapping, ensuring correct SKU linkage
  const attrValue =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findUnique({
      where: { id: props.attributeValueId },
    });
  if (!attrValue || attrValue.shopping_mall_product_sku_id !== props.skuId) {
    throw new HttpException(
      "Attribute value mapping not found for this SKU",
      404,
    );
  }
  // Fetch the SKU and verify seller ownership
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
  });
  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }
  // Check ownership (catalog right): Seller must own the product for this SKU
  // Requires joining to product for seller ownership, so fetch product for SKU
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the mapping
  const deleted =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.delete({
      where: { id: props.attributeValueId },
    });
  // Format and return the deleted record (all dates must be string iso)
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
