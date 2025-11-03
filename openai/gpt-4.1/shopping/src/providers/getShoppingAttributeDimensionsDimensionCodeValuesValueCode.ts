import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";

export async function getShoppingAttributeDimensionsDimensionCodeValuesValueCode(props: {
  dimensionCode: string;
  valueCode: string;
}): Promise<IShoppingAttributeValue> {
  // 1. Look up the attribute dimension by dimension_code.
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }
  // 2. Look up the attribute value by value_code and dimension.
  const value = await MyGlobal.prisma.shopping_attribute_values.findFirst({
    where: {
      shopping_attribute_dimension_id: dimension.id,
      value_code: props.valueCode,
    },
  });
  if (!value) {
    throw new HttpException("Attribute value not found", 404);
  }
  // 3. Map to response type.
  return {
    id: value.id,
    shopping_attribute_dimension_id: value.shopping_attribute_dimension_id,
    value_code: value.value_code,
    display_value: value.display_value,
    display_order: value.display_order ?? undefined,
    created_at: toISOStringSafe(value.created_at),
  };
}
