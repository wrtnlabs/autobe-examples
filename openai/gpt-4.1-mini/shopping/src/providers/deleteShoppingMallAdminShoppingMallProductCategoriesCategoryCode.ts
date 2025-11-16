import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallProductCategoriesCategoryCode(props: {
  admin: AdminPayload;
  categoryCode: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.shopping_mall_product_categories.findUnique({
      where: { code: props.categoryCode },
    });

  if (!existing) {
    throw new HttpException("Product category not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_product_categories.delete({
    where: { code: props.categoryCode },
  });
}
