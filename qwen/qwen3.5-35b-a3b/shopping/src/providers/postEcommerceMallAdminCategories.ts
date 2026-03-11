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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategory.ICreate;
}): Promise<IEcommerceMallCategory> {
  const { body } = props;
  // Validate parent category if provided
  if (body.parent_category_id != null) {
    const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: { id: body.parent_category_id },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 400);
    }
    if (!parent.is_leaf) {
      throw new HttpException(
        "Subcategories can only be one level deep. Parent must be a leaf category.",
        400,
      );
    }
  }
  // Check name uniqueness within parent level
  const existing = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      name: body.name,
      parent_category_id: body.parent_category_id ?? null,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Category name already exists at this level", 400);
  }
  // Create category using collector
  const collected = await EcommerceMallCategoryCollector.collect({ body });
  const created = await MyGlobal.prisma.ecommerce_mall_categories.create({
    data: collected,
    select: {
      id: true,
      name: true,
      description: true,
      is_leaf: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      parent_category_id: true,
      _count: {
        select: {
          children: true,
          products: true,
        },
      },
    },
  });
  // Fetch parent category if it exists
  let parent: IEcommerceMallCategory.ISummary | null = null;
  if (created.parent_category_id) {
    const parentRecord =
      await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
        where: { id: created.parent_category_id },
        select: {
          id: true,
          name: true,
          description: true,
          is_leaf: true,
          created_at: true,
          deleted_at: true,
        },
      });
    if (parentRecord) {
      parent = {
        id: parentRecord.id,
        name: parentRecord.name,
        description: parentRecord.description,
        isLeaf: parentRecord.is_leaf,
        createdAt: toISOStringSafe(parentRecord.created_at),
        deletedAt: parentRecord.deleted_at
          ? toISOStringSafe(parentRecord.deleted_at)
          : null,
      } satisfies IEcommerceMallCategory.ISummary;
    }
  }
  return {
    id: created.id,
    name: created.name,
    description: created.description,
    is_leaf: created.is_leaf,
    product_count: created._count.products,
    subcategory_count: created._count.children,
    parent,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  } satisfies IEcommerceMallCategory;
}
