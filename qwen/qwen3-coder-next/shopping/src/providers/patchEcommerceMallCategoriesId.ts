import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategoriesId(props: {
  id: string & tags.Format<"uuid">;
  body: IEcommerceMallCategory.IUpdate;
}): Promise<IEcommerceMallCategory> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.id },
      select: {
        id: true,
        name: true,
        description: true,
        parent_category_id: true,
        created_at: true,
        updated_at: true,
      },
    });
  const newParentId =
    props.body.parent_category_id ?? category.parent_category_id;
  if (newParentId) {
    const parent =
      await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
        where: { id: newParentId },
        select: { parent_category_id: true },
      });
    if (parent.parent_category_id) {
      throw new HttpException(
        "Cannot nest a category under a subcategory (one-level nesting enforced)",
        400,
      );
    }
    const hasCycle = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
      where: {
        id: props.id,
        parent_category_id: newParentId,
      },
    });
    if (hasCycle) {
      throw new HttpException(
        "Cannot create cyclic parent-child relationship",
        400,
      );
    }
  }
  const nameToUpdate = props.body.name;
  if (
    nameToUpdate &&
    nameToUpdate.toLowerCase() !== category.name.toLowerCase()
  ) {
    const existingName =
      await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
        where: {
          id: { not: props.id },
          name: nameToUpdate,
          parent_category_id: newParentId,
        },
      });
    if (existingName) {
      throw new HttpException(
        "Category name must be unique under the same parent",
        409,
      );
    }
  }
  const updatedCategory =
    await MyGlobal.prisma.ecommerce_mall_categories.update({
      where: { id: props.id },
      data: {
        name: nameToUpdate ?? category.name,
        description: props.body.description ?? category.description,
        parent_category_id: newParentId,
        updated_at: new Date(),
      },
    });
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
      data: {
        id: v4(),
        category_id: props.id,
        snapshot_type: "edit",
        before_name: category.name,
        before_description: category.description ?? "",
        after_name: updatedCategory.name,
        after_description: updatedCategory.description ?? "",
        created_at: new Date(),
        admin_id: null,
      },
    });
  return {
    id: updatedCategory.id,
    snapshot_type: "edit",
    before_name: category.name,
    before_description: category.description ?? "",
    after_name: updatedCategory.name,
    after_description: updatedCategory.description ?? "",
    created_at: toISOStringSafe(updatedCategory.created_at),
    category_id: updatedCategory.id,
    admin_id: snapshot.admin_id,
  };
}
