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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  // Verify category exists
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Validate unique name among siblings
  const existingByName =
    await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        name: props.body.name ?? category.name,
        parent_category_id:
          props.body.parent_category_id ?? category.parent_category_id,
        NOT: { id: props.categoryId },
      },
    });
  if (existingByName) {
    throw new HttpException("Category name must be unique among siblings", 409);
  }
  // Validate parent category if provided
  if (props.body.parent_category_id !== undefined) {
    if (props.body.parent_category_id !== null) {
      const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
        {
          where: { id: props.body.parent_category_id },
          select: { id: true },
        },
      );
      if (!parent) {
        throw new HttpException("Parent category not found", 400);
      }
      // Prevent cycle: parent cannot be self or descendant
      const descendants = await getDescendantIds(
        MyGlobal.prisma,
        props.body.parent_category_id,
      );
      if (descendants.has(props.categoryId)) {
        throw new HttpException(
          "Cannot move category under its own descendant",
          400,
        );
      }
    }
    // Validate one-level nesting: new parent must not have a parent
    if (props.body.parent_category_id !== null) {
      const parent = await MyGlobal.prisma.ecommerce_mall_categories.findUnique(
        {
          where: { id: props.body.parent_category_id },
          select: { parent_category_id: true },
        },
      );
      if (parent?.parent_category_id !== null) {
        throw new HttpException(
          "Parent category must be a top-level category",
          400,
        );
      }
    }
  }
  // Update the category
  const updatedCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        name: props.body.name ?? category.name,
        description: props.body.description ?? category.description,
        parent_category_id:
          props.body.parent_category_id ?? category.parent_category_id,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Create snapshot record
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
      data: {
        id: v4(),
        category_id: props.categoryId,
        admin_id: props.admin.id,
        snapshot_type: "edit",
        before_name: category.name,
        before_description: category.description ?? "",
        after_name: updatedCategory.name,
        after_description: updatedCategory.description ?? "",
        created_at: new Date(),
      },
      select: {
        id: true,
        snapshot_type: true,
        before_name: true,
        before_description: true,
        after_name: true,
        after_description: true,
        created_at: true,
        category_id: true,
        admin_id: true,
      },
    });
  // Build response using transformer pattern
  return {
    id: snapshot.id,
    snapshot_type: "edit",
    before_name: snapshot.before_name,
    before_description: snapshot.before_description,
    after_name: snapshot.after_name,
    after_description: snapshot.after_description,
    created_at: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    category_id: snapshot.category_id,
    admin_id: snapshot.admin_id,
  };
}
async function getDescendantIds(
  prisma: any,
  parentId: string,
): Promise<Set<string>> {
  const descendants = new Set<string>();
  const directChildren = await prisma.ecommerce_mall_categories.findMany({
    where: { parent_category_id: parentId },
    select: { id: true },
  });
  for (const child of directChildren) {
    descendants.add(child.id);
    const subDescendants = await getDescendantIds(prisma, child.id);
    for (const id of subDescendants) {
      descendants.add(id);
    }
  }
  return descendants;
}
