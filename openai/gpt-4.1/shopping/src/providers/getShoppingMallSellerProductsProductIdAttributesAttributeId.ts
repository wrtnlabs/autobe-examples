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

export async function getShoppingMallSellerProductsProductIdAttributesAttributeId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductAttribute> {
  // Query for the attribute ensuring association with the specified product and not deleted
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
  // Query the product to verify ownership and non-deleted status
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Forbidden: You do not own this product or it is not available",
      403,
    );
  }
  return {
    id: attribute.id,
    shopping_mall_product_id: attribute.shopping_mall_product_id,
    attribute_name: attribute.attribute_name,
    position: attribute.position,
    created_at: toISOStringSafe(attribute.created_at),
    updated_at: toISOStringSafe(attribute.updated_at),
    deleted_at:
      attribute.deleted_at !== null && attribute.deleted_at !== undefined
        ? toISOStringSafe(attribute.deleted_at)
        : undefined,
  };
}
