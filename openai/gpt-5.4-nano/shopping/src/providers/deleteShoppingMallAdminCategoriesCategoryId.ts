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
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existingCategory = await tx.shopping_mall_categories.findUnique({
      where: { id: props.categoryId },
      select: { id: true, slug: true },
    });
    if (existingCategory === null) {
      throw new HttpException("Category not found", 404);
    }
    const uncategorized = await tx.shopping_mall_categories.findFirst({
      where: { slug: "uncategorized" },
      select: { id: true },
    });
    if (uncategorized === null) {
      throw new HttpException("Uncategorized category not configured", 500);
    }
    const nowIso = typia.assert<string & tags.Format<"date-time">>(
      new Date().toISOString(),
    );
    await tx.shopping_mall_categories.update({
      where: { id: existingCategory.id },
      data: {
        deleted_at: nowIso,
        // keep existing visibility to preserve internal ordering; customer browsing is controlled by deleted_at
      },
    });
    await tx.shopping_mall_products.updateMany({
      where: { shopping_mall_category_id: existingCategory.id },
      data: {
        shopping_mall_category_id: uncategorized.id,
        updated_at: new Date(),
      },
    });
  });
}
