import { IEcommerceCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategoryTree";
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

export async function getEcommerceTree(): Promise<IEcommerceCategoryTree[]> {
  const rootCategories = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: {
      parent_id: null,
      deleted_at: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (rootCategories.length === 0) {
    return [];
  }
  const tree = await ArrayUtil.asyncMap(rootCategories, async (root) => {
    const subcategories = await MyGlobal.prisma.ecommerce_categories.findMany({
      where: {
        parent_id: root.id,
        deleted_at: null,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });
    const rootCategory: IEcommerceCategoryTree = {
      id: root.id as string & tags.Format<"uuid">,
      name: root.name,
      description: root.description ?? null,
      created_at: toISOStringSafe(root.created_at),
      updated_at: toISOStringSafe(root.updated_at),
      subcategories: await ArrayUtil.asyncMap(subcategories, async (sub) => ({
        id: sub.id as string & tags.Format<"uuid">,
        name: sub.name,
        description: sub.description ?? null,
        created_at: toISOStringSafe(sub.created_at),
        updated_at: toISOStringSafe(sub.updated_at),
        subcategories: [],
      })),
    };
    return rootCategory;
  });
  return tree;
}
