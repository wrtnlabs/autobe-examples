import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCategoryTransformer } from "../transformers/EcommerceCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceCategory.IUpdate;
}): Promise<IEcommerceCategory> {
  // Verify category exists and is active
  const existingCategory =
    await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
      where: { id: props.categoryId, deleted_at: null },
    });
  // Circular reference prevention check
  if (props.body.parent_category_id === props.categoryId) {
    throw new HttpException("Cannot assign category as its own parent", 400);
  }
  // Parent category validation if updating parent
  if (
    props.body.parent_category_id !== undefined &&
    props.body.parent_category_id !== null
  ) {
    await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
      where: { id: props.body.parent_category_id, deleted_at: null },
    });
  }
  // Name uniqueness validation within same parent level
  if (props.body.name !== undefined) {
    const parentId =
      props.body.parent_category_id ?? existingCategory.parent_category_id;
    const conflictingCategory =
      await MyGlobal.prisma.ecommerce_categories.findFirst({
        where: {
          name: props.body.name,
          parent_category_id: parentId,
          deleted_at: null,
          id: { not: props.categoryId },
        },
      });
    if (conflictingCategory) {
      throw new HttpException(
        "Category name already exists at this hierarchy level",
        409,
      );
    }
  }
  const now = toISOStringSafe(new Date());
  // Update category with proper nullable handling
  const updated = await MyGlobal.prisma.ecommerce_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_category_id !== undefined && {
        parent_category_id: props.body.parent_category_id,
      }),
      updated_at: new Date(now),
    },
    ...EcommerceCategoryTransformer.select(),
  });
  return await EcommerceCategoryTransformer.transform(updated);
}
