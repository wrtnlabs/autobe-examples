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
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Check if attribute name already exists for this product
  const existingAttribute =
    await MyGlobal.prisma.shopping_mall_product_attributes.findFirst({
      where: {
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        deleted_at: null,
      },
    });

  if (existingAttribute) {
    throw new HttpException(
      "Attribute name already exists for this product",
      409,
    );
  }

  // Create the new attribute
  const created = await MyGlobal.prisma.shopping_mall_product_attributes.create(
    {
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        attribute_name: props.body.attribute_name,
        attribute_value: props.body.attribute_value,
        display_order: props.body.display_order,
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_product_id: created.shopping_mall_product_id as string &
      tags.Format<"uuid">,
    attribute_name: created.attribute_name,
    attribute_value: created.attribute_value,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
