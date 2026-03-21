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

export async function postEcommerceMallAdminAdminCategoriesCategoryIdSubcategories(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // Validate parent category exists and is top-level (parent_id must be NULL)
  const parentCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: props.categoryId },
      select: { id: true, parent_id: true, deleted_at: true },
    });
  if (!parentCategory || parentCategory.deleted_at !== null) {
    throw new HttpException("Parent category not found", 400);
  }
  // Check that parent is a top-level category (cannot create subcategory under subcategory)
  if (parentCategory.parent_id !== null) {
    throw new HttpException(
      "Cannot create subcategory under another subcategory",
      400,
    );
  }
  // Check for duplicate subcategory name under the same parent
  const existingSubcategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        parent_id: props.categoryId,
        name: props.body.name,
        deleted_at: null,
      },
    });
  if (existingSubcategory) {
    throw new HttpException(
      "Subcategory with this name already exists under the parent category",
      409,
    );
  }
  // Create subcategory with parent_id set to the provided categoryId
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      description: props.body.description ?? null,
      parent_id: props.categoryId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(created);
}
