import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
    select: { id: true },
  });
  await MyGlobal.prisma.$transaction(async (tx) => {
    const uncategorized = await tx.shopping_mall_categories.findFirstOrThrow({
      where: {
        slug: "uncategorized",
        deleted_at: null,
      },
      select: { id: true },
    });
    const nowIso = toISOStringSafe(new Date());
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        deleted_at: nowIso,
      },
      select: { id: true },
    });
    await tx.shopping_mall_products.updateMany({
      where: { shopping_mall_category_id: props.categoryId },
      data: {
        shopping_mall_category_id: uncategorized.id,
      },
    });
  });
}
