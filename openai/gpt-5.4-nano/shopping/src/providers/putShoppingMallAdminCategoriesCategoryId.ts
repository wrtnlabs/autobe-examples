import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  const existing =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_category_id: true,
        name: true,
        description: true,
        slug: true,
        visibility: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        name: props.body.name ?? existing.name,
        description: props.body.description ?? existing.description,
        updated_at: new Date(),
      },
    });
    const reloaded = await tx.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        parent_category_id: true,
        name: true,
        description: true,
        slug: true,
        visibility: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: reloaded.id,
      parent_category_id: reloaded.parent_category_id,
      name: reloaded.name,
      description: reloaded.description,
      slug: reloaded.slug,
      visibility: reloaded.visibility,
      display_order: reloaded.display_order,
      created_at: toISOStringSafe(reloaded.created_at),
      updated_at: toISOStringSafe(reloaded.updated_at),
      deleted_at: reloaded.deleted_at
        ? toISOStringSafe(reloaded.deleted_at)
        : null,
    } satisfies IShoppingMallCategory;
  });
  return updated;
}
