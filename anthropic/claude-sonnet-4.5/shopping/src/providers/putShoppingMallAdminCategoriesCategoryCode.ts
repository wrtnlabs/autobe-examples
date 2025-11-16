import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCategoriesCategoryCode(props: {
  admin: AdminPayload;
  categoryCode: string;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const existing = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: { slug: props.categoryCode },
  });

  if (!existing) {
    throw new HttpException("Category not found", 404);
  }

  const updated = await MyGlobal.prisma.shopping_mall_categories.update({
    where: { slug: props.categoryCode },
    data: {
      parent_id:
        props.body.parent_id !== undefined
          ? props.body.parent_id
          : existing.parent_id,
      name: props.body.name !== undefined ? props.body.name : existing.name,
      slug: props.body.slug !== undefined ? props.body.slug : existing.slug,
      description:
        props.body.description !== undefined
          ? props.body.description
          : existing.description,
      image_url:
        props.body.image_url !== undefined
          ? props.body.image_url
          : existing.image_url,
      display_order:
        props.body.display_order !== undefined
          ? props.body.display_order
          : existing.display_order,
      status:
        props.body.status !== undefined ? props.body.status : existing.status,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    parent_id:
      updated.parent_id === null
        ? undefined
        : (updated.parent_id as string & tags.Format<"uuid">),
    name: updated.name,
    slug: updated.slug,
    description: updated.description === null ? undefined : updated.description,
    image_url:
      updated.image_url === null
        ? undefined
        : (updated.image_url as string & tags.Format<"uri">),
    display_order: updated.display_order,
    status: updated.status as "active" | "inactive",
    product_count: updated.product_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
