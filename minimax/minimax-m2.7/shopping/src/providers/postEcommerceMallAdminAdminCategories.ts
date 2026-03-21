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

export async function postEcommerceMallAdminAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // Validate parent category if provided
  if (props.body.parent_id) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.body.parent_id,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (!parent) {
      throw new HttpException("Parent category not found", 404);
    }
    // Enforce maximum 1 level of nesting - parent cannot be a subcategory
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot create subcategory under a subcategory",
        400,
      );
    }
  }
  // Check name uniqueness within same parent scope
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      parent_id: props.body.parent_id ?? null,
      name: props.body.name,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing) {
    throw new HttpException("Category name already exists in this scope", 409);
  }
  // Create category using collector
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: await EcommerceMallCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceMallCategoryTransformer.select(),
  });
  // Transform and return
  return await EcommerceMallCategoryTransformer.transform(created);
}
