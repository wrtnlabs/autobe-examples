import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminAttributeDimensionsDimensionCode(props: {
  admin: AdminPayload;
  dimensionCode: string;
}): Promise<void> {
  // Step 1: Find the attribute dimension by dimension_code
  const dimension =
    await MyGlobal.prisma.shopping_attribute_dimensions.findUnique({
      where: { dimension_code: props.dimensionCode },
      select: { id: true },
    });
  if (!dimension) {
    throw new HttpException("Attribute dimension not found", 404);
  }

  // Step 2: Check if any product attributes reference this dimension
  const productAttrCount =
    await MyGlobal.prisma.shopping_product_attributes.count({
      where: {
        attributeValue: { attributeDimension: { id: dimension.id } },
      },
    });

  // Step 3: Check if any SKU variants reference this dimension
  const skuVariantCount = await MyGlobal.prisma.shopping_sku_variants.count({
    where: {
      attributeValue: { attributeDimension: { id: dimension.id } },
    },
  });

  if (productAttrCount > 0 || skuVariantCount > 0) {
    throw new HttpException(
      "Cannot delete: Attribute dimension is still used by SKUs or products",
      409,
    );
  }

  // Step 4: Delete all attribute values for this dimension
  await MyGlobal.prisma.shopping_attribute_values.deleteMany({
    where: { shopping_attribute_dimension_id: dimension.id },
  });

  // Step 5: Delete the dimension itself
  await MyGlobal.prisma.shopping_attribute_dimensions.delete({
    where: { id: dimension.id },
  });

  // Step 6: Log admin hard delete operation in shopping_audit_logs
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      category: "catalog",
      event_type: "ATTRIBUTE_DIMENSION_DELETE",
      description: `Dimension ${props.dimensionCode} deleted by admin`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
