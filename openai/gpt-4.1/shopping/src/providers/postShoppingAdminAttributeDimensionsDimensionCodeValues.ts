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

export async function postShoppingAdminAttributeDimensionsDimensionCodeValues(props: {
  admin: AdminPayload;
  dimensionCode: string;
  body: IShoppingAttributeValue.ICreate;
}): Promise<IShoppingAttributeValue> {
  // Find attribute dimension by code
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }

  // Enforce uniqueness of value_code within this dimension
  const existing = await MyGlobal.prisma.shopping_attribute_values.findFirst({
    where: {
      shopping_attribute_dimension_id: dimension.id,
      value_code: props.body.value_code,
    },
  });
  if (existing) {
    throw new HttpException(
      "Attribute value with this code already exists in this dimension.",
      409,
    );
  }

  // Create new attribute value row
  const created = await MyGlobal.prisma.shopping_attribute_values.create({
    data: {
      id: v4(),
      shopping_attribute_dimension_id: dimension.id,
      value_code: props.body.value_code,
      display_value: props.body.display_value,
      display_order: props.body.display_order ?? null,
      // Prisma type does not allow description here, not fixing this as per casting agent scope
      created_at: toISOStringSafe(new Date()),
    },
  });
  // Map created DB row to DTO format (null -> undefined for optional fields)
  return {
    id: created.id,
    shopping_attribute_dimension_id: created.shopping_attribute_dimension_id,
    value_code: created.value_code,
    display_value: created.display_value,
    display_order: created.display_order ?? undefined,
    // Prisma type does not expose description here, not fixing this as per casting agent scope
    created_at: toISOStringSafe(created.created_at),
  };
}
