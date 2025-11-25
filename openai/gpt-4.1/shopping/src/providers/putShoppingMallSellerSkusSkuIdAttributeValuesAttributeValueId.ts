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

export async function putShoppingMallSellerSkusSkuIdAttributeValuesAttributeValueId(props: {
  seller: SellerPayload;
  skuId: string & tags.Format<"uuid">;
  attributeValueId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttributeValue.IUpdate;
}): Promise<IShoppingMallProductAttributeValue> {
  // 1. Find the attribute value mapping by id and validate sku
  const found =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findUnique({
      where: { id: props.attributeValueId },
    });
  if (!found || found.shopping_mall_product_sku_id !== props.skuId) {
    throw new HttpException(
      "Attribute value mapping not found for this SKU.",
      404,
    );
  }
  // 2. Ownership check via product.shopping_mall_seller_id
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: props.skuId },
    select: { shopping_mall_product_id: true },
  });
  if (!sku) {
    throw new HttpException("Forbidden: You do not own this SKU.", 403);
  }
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: sku.shopping_mall_product_id },
    select: { shopping_mall_seller_id: true },
  });
  if (!product || product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this SKU.", 403);
  }
  // 3. Uniqueness check if changing attribute id
  const newAttributeId =
    props.body.shopping_mall_product_attribute_id ??
    found.shopping_mall_product_attribute_id;
  if (
    props.body.shopping_mall_product_attribute_id !== undefined &&
    newAttributeId !== found.shopping_mall_product_attribute_id
  ) {
    const duplicate =
      await MyGlobal.prisma.shopping_mall_product_attribute_values.findFirst({
        where: {
          shopping_mall_product_sku_id: props.skuId,
          shopping_mall_product_attribute_id: newAttributeId,
          NOT: { id: props.attributeValueId },
        },
      });
    if (duplicate) {
      throw new HttpException(
        "Duplicate mapping: (SKU, Attribute) pair already exists.",
        409,
      );
    }
  }
  // 4. Perform update
  const updated =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.update({
      where: { id: props.attributeValueId },
      data: {
        ...(props.body.value_display_name !== undefined
          ? { value_display_name: props.body.value_display_name }
          : {}),
        ...(props.body.shopping_mall_product_attribute_id !== undefined
          ? {
              shopping_mall_product_attribute_id:
                props.body.shopping_mall_product_attribute_id,
            }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  // 5. Return DTO formatted result
  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    shopping_mall_product_attribute_id:
      updated.shopping_mall_product_attribute_id,
    value_display_name: updated.value_display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
