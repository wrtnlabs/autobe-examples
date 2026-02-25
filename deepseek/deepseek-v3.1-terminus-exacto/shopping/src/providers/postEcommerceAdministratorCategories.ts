import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCategoryCollector } from "../collectors/EcommerceCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCategoryTransformer } from "../transformers/EcommerceCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCategory.ICreate;
}): Promise<IEcommerceCategory> {
  // Check if category name already exists
  const existing = await MyGlobal.prisma.ecommerce_categories.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Category name already exists", 400);
  }
  // Validate parent category if provided
  // Using type assertion to handle parent_category_id which may not be in ICreate type
  const parentCategoryId = (props.body as any).parent_category_id;
  if (parentCategoryId) {
    const parentCategory =
      await MyGlobal.prisma.ecommerce_categories.findUnique({
        where: {
          id: parentCategoryId,
          deleted_at: null,
        },
        select: { parent_category_id: true },
      });
    if (!parentCategory) {
      throw new HttpException("Parent category not found", 404);
    }
    // Ensure parent category is not itself a subcategory (maintain one-level nesting)
    if (parentCategory.parent_category_id !== null) {
      throw new HttpException(
        "Cannot create subcategory of a subcategory",
        400,
      );
    }
  }
  // Create the category using collector
  const category = await MyGlobal.prisma.ecommerce_categories.create({
    data: await EcommerceCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceCategoryTransformer.select(),
  });
  return await EcommerceCategoryTransformer.transform(category);
}
