import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
  // Find existing category ensuring not soft-deleted
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
      parent_id: true,
      name: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Category not found", 404);
  }
  // Check for duplicate name if name is being updated
  if (props.body.name !== undefined && props.body.name !== existing.name) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_categories.findFirst(
      {
        where: {
          parent_id: existing.parent_id,
          name: props.body.name,
          deleted_at: null,
          id: {
            not: props.categoryId,
          },
        },
        select: { id: true },
      },
    );
    if (duplicate !== null) {
      throw new HttpException(
        "Category name already exists within this parent scope",
        409,
      );
    }
  }
  // Build update data
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    updated_at: new Date(),
  };
  // Execute update
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // Fetch updated record with full selection
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  // Transform and return
  return await EcommerceMallCategoryTransformer.transform(updated);
}
