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

export async function postShoppingMallSellerSkusSkuIdAttributeValues(props: {
  seller: SellerPayload;
  skuId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttributeValue.ICreate;
}): Promise<IShoppingMallProductAttributeValue> {
  const { seller, skuId, body } = props;

  // 1. Find SKU & check ownership and not deleted
  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: skuId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });
  if (!sku) {
    throw new HttpException("SKU not found, deleted, or inaccessible.", 404);
  }

  // 2. Confirm the SKU's product is owned by this seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: { id: sku.shopping_mall_product_id, seller: { id: seller.id } },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Seller does not own this SKU's product.", 403);
  }

  // 3. Validate attribute exists, not deleted, belongs to same product
  const attribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        id: body.shopping_mall_product_attribute_id,
        deleted_at: null,
        shopping_mall_product_id: sku.shopping_mall_product_id,
      },
      select: { id: true },
    });
  if (!attribute) {
    throw new HttpException(
      "Attribute not found, deleted, or not associated with the SKU's product.",
      404,
    );
  }

  // 4. Enforce uniqueness: no existing mapping for (skuId, attributeId)
  const duplicate =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findFirst({
      where: {
        shopping_mall_product_sku_id: skuId,
        shopping_mall_product_attribute_id:
          body.shopping_mall_product_attribute_id,
      },
      select: { id: true },
    });
  if (duplicate) {
    throw new HttpException(
      "A value for this attribute and SKU already exists.",
      409,
    );
  }

  // 5. Create the new attribute value mapping
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.create({
      data: {
        id: v4(),
        shopping_mall_product_sku_id: skuId,
        shopping_mall_product_attribute_id:
          body.shopping_mall_product_attribute_id,
        value_display_name: body.value_display_name,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    shopping_mall_product_attribute_id:
      created.shopping_mall_product_attribute_id,
    value_display_name: created.value_display_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
