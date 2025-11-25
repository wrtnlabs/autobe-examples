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

export async function putShoppingMallAdminSkusSkuIdAttributeValuesAttributeValueId(props: {
  admin: AdminPayload;
  skuId: string & tags.Format<"uuid">;
  attributeValueId: string & tags.Format<"uuid">;
  body: IShoppingMallProductAttributeValue.IUpdate;
}): Promise<IShoppingMallProductAttributeValue> {
  // Fetch the attribute value mapping by ID
  const record =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.findUnique({
      where: { id: props.attributeValueId },
    });
  if (!record || record.shopping_mall_product_sku_id !== props.skuId) {
    throw new HttpException(
      "Attribute value mapping not found for this SKU",
      404,
    );
  }

  // Uniqueness check if attribute ID is being changed
  let newAttributeId = record.shopping_mall_product_attribute_id;
  if (
    props.body.shopping_mall_product_attribute_id !== undefined &&
    props.body.shopping_mall_product_attribute_id !==
      record.shopping_mall_product_attribute_id
  ) {
    const exists =
      await MyGlobal.prisma.shopping_mall_product_attribute_values.findFirst({
        where: {
          shopping_mall_product_sku_id: props.skuId,
          shopping_mall_product_attribute_id:
            props.body.shopping_mall_product_attribute_id,
          NOT: { id: props.attributeValueId },
        },
      });
    if (exists) {
      throw new HttpException(
        "This SKU already has a value mapping for the specified attribute",
        409,
      );
    }
    newAttributeId = props.body.shopping_mall_product_attribute_id;
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.value_display_name !== undefined) {
    updateData.value_display_name = props.body.value_display_name;
  }
  if (props.body.shopping_mall_product_attribute_id !== undefined) {
    updateData.shopping_mall_product_attribute_id =
      props.body.shopping_mall_product_attribute_id;
  }

  const updated =
    await MyGlobal.prisma.shopping_mall_product_attribute_values.update({
      where: { id: props.attributeValueId },
      data: updateData,
    });

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
