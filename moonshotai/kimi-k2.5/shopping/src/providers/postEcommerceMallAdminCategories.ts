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
  // Validate parent category if provided
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: props.body.parentId },
      select: { id: true, parent_id: true, deleted_at: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category does not exist", 400);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category has been deleted", 400);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Parent category must be a top-level category",
        400,
      );
    }
  }
  // Check for duplicate name (case-insensitive) within same parent scope
  const existingCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        name: {
          equals: props.body.name,
          mode: "insensitive",
        },
        parent_id: props.body.parentId ?? null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingCategory !== null) {
    throw new HttpException(
      "Category with this name already exists in the same parent scope",
      409,
    );
  }
  // Create category using Collector
  const createInput = await EcommerceMallCategoryCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: createInput,
    ...EcommerceMallCategoryTransformer.select(),
  });
  return await EcommerceMallCategoryTransformer.transform(created);
}
