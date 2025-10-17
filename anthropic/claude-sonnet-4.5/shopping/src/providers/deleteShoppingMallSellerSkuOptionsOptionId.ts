import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSkuOptionsOptionId(props: {
  seller: SellerPayload;
  optionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { optionId } = props;

  // Verify the SKU option exists
  const skuOption = await MyGlobal.prisma.shopping_mall_sku_options.findUnique({
    where: { id: optionId },
  });

  if (!skuOption) {
    throw new HttpException("SKU option not found", 404);
  }

  // Check if any SKUs (active or inactive) reference this option
  // This prevents orphaned references and maintains referential integrity
  const referencingSKU = await MyGlobal.prisma.shopping_mall_skus.findFirst({
    where: {
      shopping_mall_sku_option_id: optionId,
    },
  });

  if (referencingSKU) {
    throw new HttpException(
      "Cannot delete SKU option: it is currently referenced by product SKUs. Please remove or update the SKUs first.",
      409,
    );
  }

  // Perform hard delete (no soft delete field in schema)
  await MyGlobal.prisma.shopping_mall_sku_options.delete({
    where: { id: optionId },
  });
}
