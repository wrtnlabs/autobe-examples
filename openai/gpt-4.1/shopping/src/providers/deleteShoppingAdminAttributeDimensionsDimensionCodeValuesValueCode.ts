import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminAttributeDimensionsDimensionCodeValuesValueCode(props: {
  admin: AdminPayload;
  dimensionCode: string;
  valueCode: string;
}): Promise<void> {
  // Step 1: Find the attribute dimension by code
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }

  // Step 2: Find the attribute value by valueCode + dimension id
  const value = await MyGlobal.prisma.shopping_attribute_values.findUnique({
    where: {
      shopping_attribute_dimension_id_value_code: {
        shopping_attribute_dimension_id: dimension.id,
        value_code: props.valueCode,
      },
    },
  });
  if (!value) {
    throw new HttpException(
      "Attribute value not found in specified dimension",
      404,
    );
  }

  // Step 3: Attempt hard delete
  try {
    await MyGlobal.prisma.shopping_attribute_values.delete({
      where: { id: value.id },
    });
  } catch (err) {
    // Detect constraint violation (in use by SKU/Product)
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2003"
    ) {
      // Prisma P2003: Foreign key constraint failed
      throw new HttpException(
        "Cannot delete attribute value: still in use by product or SKU.",
        409,
      );
    }
    throw new HttpException("Failed to delete attribute value", 500);
  }
}
