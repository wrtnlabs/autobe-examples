import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategoriesCategoryId(props: {
  categoryId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategory> {
  const category =
    await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        is_leaf: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        parent: EcommerceMallCategoryAtSummaryTransformer.select(),
      },
    });
  const descendantCategoryIds = await getDescendantCategoryIds(
    props.categoryId,
  );
  const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      category_id: {
        in: descendantCategoryIds,
      },
      is_active: true,
    },
  });
  const subcategoryCount =
    await MyGlobal.prisma.ecommerce_mall_categories.count({
      where: {
        parent_category_id: props.categoryId,
        deleted_at: null,
      },
    });
  const result: IEcommerceMallCategory = {
    id: category.id,
    name: category.name,
    description: category.description,
    is_leaf: category.is_leaf,
    product_count: productCount as number & tags.Type<"int32">,
    subcategory_count: subcategoryCount as number & tags.Type<"int32">,
    parent: category.parent
      ? await EcommerceMallCategoryAtSummaryTransformer.transform(
          category.parent,
        )
      : null,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
    deleted_at: category.deleted_at
      ? toISOStringSafe(category.deleted_at)
      : null,
  };
  return result satisfies IEcommerceMallCategory;
}
async function getDescendantCategoryIds(
  categoryId: string & tags.Format<"uuid">,
): Promise<Array<string & tags.Format<"uuid">>> {
  const allDescendants = await getRecursiveDescendants(categoryId, []);
  return allDescendants;
}
async function getRecursiveDescendants(
  categoryId: string & tags.Format<"uuid">,
  accumulated: Array<string & tags.Format<"uuid">>,
): Promise<Array<string & tags.Format<"uuid">>> {
  const children = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: {
      parent_category_id: categoryId,
      deleted_at: null,
    },
    select: { id: true, parent_category_id: true },
  });
  const childIds = children.map((c) => c.id);
  const newAccumulated = [...accumulated, ...childIds];
  for (const childId of childIds) {
    await getRecursiveDescendants(childId, newAccumulated);
  }
  return newAccumulated;
}
