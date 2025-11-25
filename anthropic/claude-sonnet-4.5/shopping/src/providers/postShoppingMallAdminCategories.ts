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

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_categories.create({
    data: {
      id: v4(),
      parent_id: props.body.parent_id ?? null,
      name: props.body.name,
      slug: props.body.slug,
      description: props.body.description ?? null,
      image_url: props.body.image_url ?? null,
      display_order: props.body.display_order,
      status: props.body.status,
      product_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    parent_id: created.parent_id,
    parent: undefined,
    name: created.name,
    slug: created.slug,
    description: created.description,
    image_url: created.image_url,
    display_order: created.display_order,
    status: typia.assert<"active" | "inactive">(created.status),
    product_count: created.product_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
