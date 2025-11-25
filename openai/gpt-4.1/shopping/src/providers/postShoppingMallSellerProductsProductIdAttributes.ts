import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductsProductIdAttributes(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttribute.ICreate;
}): Promise<IShoppingMallProductAttribute> {
  // Step 1: Find product and verify ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found.", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to add attributes to this product.",
      403,
    );
  }

  // Step 2: Ensure uniqueness of attribute_name for this product
  const exists =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new HttpException(
      "This attribute name is already used for this product.",
      409,
    );
  }

  // Step 3: Create the attribute
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_attributes.create(
    {
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        position: props.body.position,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Step 4: Return the DTO-compliant result
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    attribute_name: created.attribute_name,
    position: created.position,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
