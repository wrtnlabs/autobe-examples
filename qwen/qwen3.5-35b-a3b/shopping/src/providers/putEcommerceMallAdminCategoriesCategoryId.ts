import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  const existing =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parent_id: true,
        display_order: true,
        icon_uri: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: v4(),
      snapshot_id: props.categoryId,
      code: existing.slug,
      name: existing.name,
      description: existing.description ?? null,
      slug: existing.slug,
      parent_id: existing.parent_id ?? null,
      level: 0,
      sort_order: existing.display_order,
      is_active: existing.is_active,
      created_at: toISOStringSafe(new Date()),
    },
  });
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description ?? null;
  }
  updateData.updated_at = new Date();
  const updated = await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parent_id: true,
      display_order: true,
      icon_uri: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
          parent_id: true,
          display_order: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          description: true,
          icon_uri: true,
          deleted_at: true,
        },
      },
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description ?? undefined,
    display_order: updated.display_order,
    icon_uri: updated.icon_uri ?? undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
    parent: updated.parent
      ? await EcommerceMallCategoryAtSummaryTransformer.transform(
          updated.parent,
        )
      : undefined,
  } satisfies IEcommerceMallCategory;
}
