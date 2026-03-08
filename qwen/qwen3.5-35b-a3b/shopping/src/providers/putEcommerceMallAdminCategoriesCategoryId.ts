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
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        is_leaf: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (existingCategory.deleted_at !== null) {
    throw new HttpException("Category has been soft-deleted", 404);
  }
  const conflictCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        name: props.body.name,
        parent_category_id: existingCategory.parent_category_id,
        id: { not: props.categoryId },
        deleted_at: null,
      },
    });
  if (conflictCategory !== null) {
    throw new HttpException(
      "Category name must be unique within the same parent level",
      409,
    );
  }
  const updatedCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.update({
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
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_category_id: props.categoryId,
      snapshot_created_at: new Date(),
      name: props.body.name ?? existingCategory.name,
      description: props.body.description ?? existingCategory.description,
      is_leaf: existingCategory.is_leaf,
      created_at: existingCategory.created_at,
      updated_at: existingCategory.updated_at,
      parent_category_id: existingCategory.parent_category_id,
    },
  });
  return await EcommerceMallCategoryTransformer.transform(updatedCategory);
}
