import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminShoppingMallCategoriesCategoryName(props: {
  admin: AdminPayload;
  categoryName: string;
}): Promise<void> {
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { name: props.categoryName },
  });

  if (!category) {
    throw new HttpException("Category not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_categories.delete({
    where: { name: props.categoryName },
  });
}
