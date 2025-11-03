import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminAttributeDimensionsDimensionCodeValuesValueCode(props: {
  admin: AdminPayload;
  dimensionCode: string;
  valueCode: string;
  body: IShoppingAttributeValue.IUpdate;
}): Promise<IShoppingAttributeValue> {
  // 1. Lookup attribute dimension
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }
  // 2. Lookup attribute value under this dimension
  const attributeValue =
    await MyGlobal.prisma.shopping_attribute_values.findUnique({
      where: {
        shopping_attribute_dimension_id_value_code: {
          shopping_attribute_dimension_id: dimension.id,
          value_code: props.valueCode,
        },
      },
    });
  if (!attributeValue) {
    throw new HttpException("Attribute value not found", 404);
  }
  // 3. Prepare update data (only fields present in body)
  const updateData: Record<string, unknown> = {};
  if (props.body.display_value !== undefined) {
    updateData.display_value = props.body.display_value;
  }
  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // If nothing to update, return current value
  if (Object.keys(updateData).length === 0) {
    return {
      id: attributeValue.id,
      shopping_attribute_dimension_id:
        attributeValue.shopping_attribute_dimension_id,
      value_code: attributeValue.value_code,
      display_value: attributeValue.display_value,
      display_order: attributeValue.display_order ?? undefined,
      // no description because Prisma doesn't return it
      created_at: toISOStringSafe(attributeValue.created_at),
    } as IShoppingAttributeValue;
  }
  // 4. Update & return new value
  const updated = await MyGlobal.prisma.shopping_attribute_values.update({
    where: {
      shopping_attribute_dimension_id_value_code: {
        shopping_attribute_dimension_id: dimension.id,
        value_code: props.valueCode,
      },
    },
    data: updateData,
  });
  return {
    id: updated.id,
    shopping_attribute_dimension_id: updated.shopping_attribute_dimension_id,
    value_code: updated.value_code,
    display_value: updated.display_value,
    display_order: updated.display_order ?? undefined,
    // no description because Prisma doesn't return it
    created_at: toISOStringSafe(updated.created_at),
  } as IShoppingAttributeValue;
}
