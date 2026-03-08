import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryCollector } from "../collectors/EcommerceMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  if (props.body.name.length === 0 || props.body.name.length > 500) {
    throw new HttpException("Name must be between 1 and 500 characters", 400);
  }
  if (
    props.body.parent_category_id !== undefined &&
    props.body.parent_category_id !== null
  ) {
    const parentCategory =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: props.body.parent_category_id,
          deleted_at: null,
        },
      });
    if (!parentCategory) {
      throw new HttpException("Parent category not found", 400);
    }
    if (parentCategory.parent_category_id !== null) {
      throw new HttpException(
        "Subcategories can only be one level deep. Please select a parent category without subcategories.",
        400,
      );
    }
  }
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      name: props.body.name,
      parent_category_id: props.body.parent_category_id ?? null,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "A category with this name already exists under the same parent. Please choose a different name.",
      400,
    );
  }
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(created);
}
