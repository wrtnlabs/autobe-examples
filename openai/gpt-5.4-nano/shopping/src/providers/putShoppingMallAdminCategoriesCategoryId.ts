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
  const isAdmin = props.admin.type === "admin";
  if (!isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: props.admin.session_id,
      shopping_mall_admin_id: props.admin.id,
      deleted_at: null,
      expired_at: { gt: now },
      admin: {
        id: props.admin.id,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const patch = {
    ...(props.body.name !== undefined ? { name: props.body.name } : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
  } satisfies Prisma.shopping_mall_categoriesUpdateInput;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
      },
    });
    await tx.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        ...patch,
        updated_at: now,
      },
    });
  });
  const updated =
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
  return {
    id: updated.id,
    parent_category_id: updated.parent_category_id,
    name: updated.name,
    description: updated.description,
    slug: updated.slug,
    visibility: updated.visibility,
    display_order: updated.display_order as unknown as number &
      tags.Type<"int32">,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
