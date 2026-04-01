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
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // Find existing category with all scalar fields for snapshot
  const existing =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        display_order: true,
        icon_uri: true,
        is_active: true,
        parent_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Create snapshot of current state for audit trail
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: v4(),
      category: { connect: { id: props.categoryId } },
      code: existing.slug, // Use slug as unique code
      name: existing.name,
      slug: existing.slug,
      description: existing.description ?? undefined,
      is_active: existing.is_active,
      parent_id: existing.parent_id ?? undefined,
      level: 0, // TODO: Calculate actual hierarchy level if needed
      sort_order: existing.display_order,
      created_at: existing.created_at,
    },
  });
  // Update only modifiable fields (name and description)
  const updated = await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(updated);
}
