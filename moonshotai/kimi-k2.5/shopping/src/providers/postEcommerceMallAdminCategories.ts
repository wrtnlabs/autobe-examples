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
import { EcommerceMallCategoryCollector } from "../collectors/EcommerceMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategoryTransformer } from "../transformers/EcommerceMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  // First, verify parent exists if provided
  if (props.body.parentId) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: props.body.parentId },
      select: { id: true, deleted_at: true },
    });
    if (!parent) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category has been deleted", 404);
    }
  }
  // Check for duplicate name under same parent scope
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      name: props.body.name,
      parent_id: props.body.parentId ?? null,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException(
      "Category name already exists under this parent",
      409,
    );
  }
  // Create using collector
  const data = await EcommerceMallCategoryCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data,
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(created);
}
