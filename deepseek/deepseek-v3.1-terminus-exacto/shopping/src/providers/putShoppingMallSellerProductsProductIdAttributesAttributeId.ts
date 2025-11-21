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
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify product exists and belongs to seller
    const product = await tx.shopping_mall_products.findFirst({
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    });

    if (!product) {
      throw new HttpException(
        "Product not found or you don't have permission to modify it",
        404,
      );
    }

    // Verify attribute exists and belongs to product
    const existingAttribute =
      await tx.shopping_mall_product_attributes.findFirst({
        where: {
          id: props.attributeId,
          shopping_mall_product_id: props.productId,
          deleted_at: null,
        },
      });

    if (!existingAttribute) {
      throw new HttpException("Attribute not found for this product", 404);
    }

    // Handle product reassignment if provided
    let targetProductId = props.productId;
    if (props.body.shopping_mall_product_id !== undefined) {
      // Verify the new product exists and belongs to seller
      const newProduct = await tx.shopping_mall_products.findFirst({
        where: {
          id: props.body.shopping_mall_product_id,
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      });

      if (!newProduct) {
        throw new HttpException(
          "Target product not found or access denied",
          404,
        );
      }
      targetProductId = props.body.shopping_mall_product_id;
    }

    // Check for attribute name uniqueness if name is being updated
    if (
      props.body.attribute_name &&
      props.body.attribute_name !== existingAttribute.attribute_name
    ) {
      const duplicateAttribute =
        await tx.shopping_mall_product_attributes.findFirst({
          where: {
            shopping_mall_product_id: targetProductId,
            attribute_name: props.body.attribute_name,
            deleted_at: null,
            id: { not: props.attributeId },
          },
        });

      if (duplicateAttribute) {
        throw new HttpException(
          `Attribute name "${props.body.attribute_name}" already exists for this product`,
          400,
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: toISOStringSafe(new Date()),
    };

    // Only update fields that are provided
    if (props.body.shopping_mall_product_id !== undefined) {
      updateData.shopping_mall_product_id = props.body.shopping_mall_product_id;
    }
    if (props.body.attribute_name !== undefined) {
      updateData.attribute_name = props.body.attribute_name;
    }
    if (props.body.attribute_value !== undefined) {
      updateData.attribute_value = props.body.attribute_value;
    }
    if (props.body.display_order !== undefined) {
      updateData.display_order = props.body.display_order;
    }

    // Update the attribute
    const updatedAttribute = await tx.shopping_mall_product_attributes.update({
      where: { id: props.attributeId },
      data: updateData,
    });

    return {
      id: updatedAttribute.id,
      shopping_mall_product_id: updatedAttribute.shopping_mall_product_id,
      attribute_name: updatedAttribute.attribute_name,
      attribute_value: updatedAttribute.attribute_value,
      display_order: updatedAttribute.display_order,
      created_at: toISOStringSafe(updatedAttribute.created_at),
      updated_at: toISOStringSafe(updatedAttribute.updated_at),
    };
  });
}
