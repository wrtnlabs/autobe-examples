import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSkuOptionsOptionId(props: {
  admin: AdminPayload;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, optionId } = props;

  // Verify the SKU option exists
  const option =
    await MyGlobal.prisma.shopping_mall_sku_options.findUniqueOrThrow({
      where: { id: optionId },
    });

  // Check for active SKU references to maintain referential integrity
  const activeSkuCount = await MyGlobal.prisma.shopping_mall_skus.count({
    where: {
      shopping_mall_sku_option_id: optionId,
    },
  });

  // Prevent deletion if any SKUs are referencing this option
  if (activeSkuCount > 0) {
    throw new HttpException(
      `Cannot delete custom SKU option "${option.option_name}: ${option.option_value}". ${activeSkuCount} active SKU variant(s) are currently using this option. Please reassign or discontinue affected SKUs before deletion.`,
      409,
    );
  }

  // Perform hard delete (schema does not support soft deletion)
  await MyGlobal.prisma.shopping_mall_sku_options.delete({
    where: { id: optionId },
  });
}
