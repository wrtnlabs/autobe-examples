import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSubcategory";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorProductCategoriesProductCategoryIdProductSubcategories(props: {
  administrator: AdministratorPayload;
  productCategoryId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSubcategory.IRequest;
}): Promise<IPageIShoppingMallProductSubcategory.ISummary> {
  await MyGlobal.prisma.shopping_mall_product_categories.findUniqueOrThrow({
    where: { id: props.productCategoryId },
  });
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const searchFilter = props.body.search
    ? {
        OR: [
          {
            name: { contains: props.body.search, mode: "insensitive" as const },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;
  const subcategories =
    await MyGlobal.prisma.shopping_mall_product_subcategories.findMany({
      where: {
        shopping_mall_product_category_id: props.productCategoryId,
        ...searchFilter,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_product_subcategories.count(
    {
      where: {
        shopping_mall_product_category_id: props.productCategoryId,
        ...searchFilter,
        deleted_at: null,
      },
    },
  );
  const data: IShoppingMallProductSubcategory.ISummary[] = subcategories.map(
    (
      subcat: (typeof subcategories)[number] & {
        category: NonNullable<(typeof subcategories)[number]["category"]>;
      },
    ) => {
      const createdAt = toISOStringSafe(subcat.created_at);
      const updatedAt = toISOStringSafe(subcat.updated_at);
      const deletedAt =
        subcat.deleted_at === null || subcat.deleted_at === undefined
          ? null
          : toISOStringSafe(subcat.deleted_at);
      const categoryCreatedAt = toISOStringSafe(subcat.category.created_at);
      const categoryUpdatedAt = toISOStringSafe(subcat.category.updated_at);
      const categoryDeletedAt =
        subcat.category.deleted_at === null ||
        subcat.category.deleted_at === undefined
          ? null
          : toISOStringSafe(subcat.category.deleted_at);
      const category: IShoppingMallProductCategory.ISummary = {
        id: subcat.category.id,
        name: subcat.category.name,
        description: subcat.category.description,
        created_at: categoryCreatedAt,
        updated_at: categoryUpdatedAt,
        deleted_at: categoryDeletedAt,
      };
      return {
        id: subcat.id,
        name: subcat.name,
        description: subcat.description ?? null,
        createdAt: createdAt,
        updatedAt: updatedAt,
        deletedAt: deletedAt,
        category: category,
      };
    },
  );
  const pageCount = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pageCount,
    },
    data,
  };
}
