import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSkuColorsColorId(props: {
  admin: AdminPayload;
  colorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { colorId } = props;

  // Verify the color exists
  await MyGlobal.prisma.shopping_mall_sku_colors.findUniqueOrThrow({
    where: { id: colorId },
  });

  // Check if any SKUs reference this color
  const skusUsingColor = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      shopping_mall_sku_color_id: colorId,
    },
  });

  if (skusUsingColor !== null) {
    throw new HttpException(
      "Cannot delete color variant that is currently in use by product SKUs",
      400,
    );
  }

  // Perform hard delete (no soft delete field exists in schema)
  await MyGlobal.prisma.shopping_mall_sku_colors.delete({
    where: { id: colorId },
  });
}
