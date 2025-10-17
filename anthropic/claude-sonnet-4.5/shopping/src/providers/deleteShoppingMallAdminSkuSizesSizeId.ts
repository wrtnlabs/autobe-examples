import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminSkuSizesSizeId(props: {
  admin: AdminPayload;
  sizeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { sizeId } = props;

  // Verify the size exists (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_sku_sizes.findUniqueOrThrow({
    where: { id: sizeId },
  });

  // Check for referential integrity - verify no active SKUs reference this size
  const referencingSKU = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      shopping_mall_sku_size_id: sizeId,
    },
  });

  if (referencingSKU) {
    throw new HttpException(
      "Cannot delete size variant: it is currently in use by active product SKUs. Remove the size from all products before deletion.",
      409,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.shopping_mall_sku_sizes.delete({
    where: { id: sizeId },
  });
}
