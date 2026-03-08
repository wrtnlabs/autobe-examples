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
  // Verify category exists and is not deleted
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        updated_at: true,
      },
    });
  // Capture current values for snapshot
  const previousValues = {
    name: category.name,
    description: category.description,
    parent_id: category.parent_id,
  };
  // Validate parent_id if provided - must exist and be a valid category
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.body.parent_id },
    });
  }
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parent_id !== undefined && {
      parent_id: props.body.parent_id,
    }),
    updated_at: new Date(),
  } satisfies Prisma.ecommerce_mall_categoriesUpdateInput;
  // Update the category
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // Create snapshot with before/after values
  const currentValues = {
    name: props.body.name ?? category.name,
    description: props.body.description ?? category.description,
    parent_id: props.body.parent_id ?? category.parent_id,
  };
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: v4(),
      category_id: props.categoryId,
      admin_id: props.admin.id,
      previous_values: JSON.stringify(previousValues),
      current_values: JSON.stringify(currentValues),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Fetch and transform the updated category
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  return await EcommerceMallCategoryTransformer.transform(updated);
}
