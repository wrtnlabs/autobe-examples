import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCategoriesCategorySlug(props: {
  admin: AdminPayload;
  categorySlug: string;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const existing = await MyGlobal.prisma.shopping_mall_categories.findFirst({
    where: {
      slug: props.categorySlug,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Category not found", 404);
  }

  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parentExists =
      await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
      });

    if (!parentExists) {
      throw new HttpException("Parent category not found", 404);
    }

    let currentParentId: string | null = props.body.parent_id;
    while (currentParentId !== null) {
      if (currentParentId === existing.id) {
        throw new HttpException(
          "Circular reference detected in category hierarchy",
          400,
        );
      }

      const parentCategory: Awaited<
        ReturnType<typeof MyGlobal.prisma.shopping_mall_categories.findFirst>
      > = await MyGlobal.prisma.shopping_mall_categories.findFirst({
        where: {
          id: currentParentId,
          deleted_at: null,
        },
      });

      if (!parentCategory) {
        break;
      }

      currentParentId = parentCategory.parent_id;
    }
  }

  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: existing.id },
    data: {
      ...(props.body.parent_id !== undefined && {
        parent_id: props.body.parent_id,
      }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.slug !== undefined && { slug: props.body.slug }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.image_url !== undefined && {
        image_url: props.body.image_url,
      }),
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    parent_id: updated.parent_id === null ? undefined : updated.parent_id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description === null ? undefined : updated.description,
    image_url: updated.image_url === null ? undefined : updated.image_url,
    display_order: updated.display_order,
    status: typia.assert<"active" | "inactive">(updated.status),
    product_count: updated.product_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
