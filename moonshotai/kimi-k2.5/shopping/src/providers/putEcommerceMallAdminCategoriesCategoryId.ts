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
  categoryId: string;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // Verify category exists
  const existing =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, parent_id: true, name: true },
    });
  // Check name uniqueness if name is being updated (case-insensitive)
  if (props.body.name !== undefined && props.body.name !== existing.name) {
    const duplicate = await MyGlobal.prisma.ecommerce_mall_categories.findFirst(
      {
        where: {
          parent_id: existing.parent_id,
          id: { not: props.categoryId },
          deleted_at: null,
          name: {
            equals: props.body.name,
            mode: "insensitive",
          },
        },
      },
    );
    if (duplicate) {
      throw new HttpException(
        "A category with this name already exists in the same parent category",
        409,
      );
    }
  }
  // Build update data dynamically
  const updateData: Prisma.ecommerce_mall_categoriesUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Perform update
  await MyGlobal.prisma.ecommerce_mall_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // Fetch and return updated category with full details
  const updated =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...EcommerceMallCategoryTransformer.select(),
    });
  return await EcommerceMallCategoryTransformer.transform(updated);
}
