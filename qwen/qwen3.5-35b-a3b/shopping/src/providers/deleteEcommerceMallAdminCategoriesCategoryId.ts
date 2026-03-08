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

export async function deleteEcommerceMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
    });
  const subcategories =
    await MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: { parent_category_id: props.categoryId },
    });
  if (subcategories.length > 0) {
    throw new HttpException(
      `Category has ${subcategories.length} subcategories that must be deleted first`,
      409,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_products.updateMany({
    where: { category_id: props.categoryId },
    data: { category_id: undefined },
  });
  const snapshotId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_category_snapshots.create({
    data: {
      id: snapshotId,
      name: category.name,
      description: category.description,
      parent_category_id: category.parent_category_id,
      is_leaf: category.is_leaf,
      snapshot_created_at: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      ecommerce_mall_category_id: props.categoryId,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_categories.delete({
    where: { id: props.categoryId },
  });
}
