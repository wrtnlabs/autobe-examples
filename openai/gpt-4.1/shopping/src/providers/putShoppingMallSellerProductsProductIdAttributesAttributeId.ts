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

export async function putShoppingMallSellerProductsProductIdAttributesAttributeId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  attributeId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.IUpdate;
}): Promise<IShoppingMallProductAttribute> {
  // 1. Look up the product to ensure it exists and is owned by the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }

  // 2. Look up the attribute by attributeId and ensure it belongs to this product
  const prev =
    await MyGlobal.prisma.shopping_mall_product_attributes.findUnique({
      where: { id: props.attributeId },
    });
  if (
    !prev ||
    prev.shopping_mall_product_id !== props.productId ||
    prev.deleted_at !== null
  ) {
    throw new HttpException("Attribute not found", 404);
  }

  // 3. Check attribute_name uniqueness within the same product, excluding self
  const exists =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        deleted_at: null,
        NOT: { id: props.attributeId },
      },
    });
  if (exists) {
    throw new HttpException(
      "Attribute name must be unique within this product",
      409,
    );
  }

  // 4. Perform the update (never mutate productId or attributeId in update)
  const updated = await MyGlobal.prisma.shopping_mall_product_attributes.update(
    {
      where: { id: props.attributeId },
      data: {
        attribute_name: props.body.attribute_name,
        position: props.body.position,
        updated_at: toISOStringSafe(new Date()),
        deleted_at:
          typeof props.body.deleted_at === "undefined"
            ? prev.deleted_at
            : props.body.deleted_at,
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
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
  };
}
