import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCategoryTransformer } from "../transformers/CommunityPlatformCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCategory.IUpdate;
}): Promise<ICommunityPlatformCategory> {
  // Validate category exists and is not soft-deleted
  const existingCategory =
    await MyGlobal.prisma.community_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId, deleted_at: null },
    });
  // Check for unique constraint violations if name or slug are being updated
  if (props.body.name !== undefined || props.body.slug !== undefined) {
    const whereClause = {
      deleted_at: null,
      ...(props.body.name && { name: props.body.name }),
      ...(props.body.slug && { slug: props.body.slug }),
      id: { not: props.categoryId },
    };
    const conflictingCategory =
      await MyGlobal.prisma.community_platform_categories.findFirst({
        where: whereClause,
      });
    if (conflictingCategory) {
      if (props.body.name && conflictingCategory.name === props.body.name) {
        throw new HttpException("Category name already exists", 400);
      }
      if (props.body.slug && conflictingCategory.slug === props.body.slug) {
        throw new HttpException("Category slug already exists", 400);
      }
    }
  }
  // Validate parent_id relationship integrity
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id === props.categoryId) {
      throw new HttpException("Category cannot be its own parent", 400);
    }
    if (props.body.parent_id !== null) {
      const parentCategory =
        await MyGlobal.prisma.community_platform_categories.findUnique({
          where: { id: props.body.parent_id, deleted_at: null },
        });
      if (!parentCategory) {
        throw new HttpException("Parent category not found", 400);
      }
      // Check for circular reference by checking if the parent is a descendant
      const isCircular = await checkCircularReference(
        props.categoryId,
        props.body.parent_id,
      );
      if (isCircular) {
        throw new HttpException(
          "Circular reference detected in category hierarchy",
          400,
        );
      }
    }
  }
  // Build update data object
  const updateData: Prisma.community_platform_categoriesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.slug !== undefined && { slug: props.body.slug }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.is_featured !== undefined && {
      is_featured: props.body.is_featured,
    }),
    ...(props.body.icon_url !== undefined && { icon_url: props.body.icon_url }),
    ...(props.body.banner_url !== undefined && {
      banner_url: props.body.banner_url,
    }),
    ...(props.body.parent_id !== undefined && {
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : { disconnect: true },
    }),
    updated_at: new Date(),
  };
  // Update the category
  await MyGlobal.prisma.community_platform_categories.update({
    where: { id: props.categoryId },
    data: updateData,
  });
  // Fetch the updated category with complete data
  const updatedCategory =
    await MyGlobal.prisma.community_platform_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...CommunityPlatformCategoryTransformer.select(),
    });
  return await CommunityPlatformCategoryTransformer.transform(updatedCategory);
}
// Helper function to check for circular references
async function checkCircularReference(
  categoryId: string,
  potentialParentId: string,
): Promise<boolean> {
  let currentId = potentialParentId;
  const visited = new Set<string>();
  while (currentId) {
    if (visited.has(currentId)) {
      // Circular reference detected in the hierarchy
      return true;
    }
    if (currentId === categoryId) {
      // Circular reference: trying to make a descendant the parent
      return true;
    }
    visited.add(currentId);
    const currentCategory =
      await MyGlobal.prisma.community_platform_categories.findUnique({
        where: { id: currentId, deleted_at: null },
        select: { parent_id: true },
      });
    if (!currentCategory || !currentCategory.parent_id) {
      break;
    }
    currentId = currentCategory.parent_id;
  }
  return false;
}
