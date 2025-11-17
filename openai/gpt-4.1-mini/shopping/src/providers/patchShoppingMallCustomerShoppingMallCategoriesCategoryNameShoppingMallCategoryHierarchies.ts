import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import { IPageIShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategoryHierarchy";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerShoppingMallCategoriesCategoryNameShoppingMallCategoryHierarchies(props: {
  customer: CustomerPayload;
  categoryName: string;
  body: IShoppingMallCategoryHierarchy.IRequest;
}): Promise<IPageIShoppingMallCategoryHierarchy.ISummary> {
  const parentCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { name: props.categoryName },
    });

  if (!parentCategory || parentCategory.deleted_at !== null) {
    throw new HttpException("Parent category not found", 404);
  }

  const childCategoryWhere: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null,
  };

  if (props.body.statusFilter === "active") {
    childCategoryWhere.status = "active";
  } else if (props.body.statusFilter === "inactive") {
    childCategoryWhere.status = "inactive";
  }

  if (props.body.searchTerm !== undefined && props.body.searchTerm !== null) {
    childCategoryWhere.OR = [
      { name: { contains: props.body.searchTerm, mode: "insensitive" } },
      { description: { contains: props.body.searchTerm, mode: "insensitive" } },
    ];
  }

  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  let orderBy: Prisma.shopping_mall_category_hierarchiesOrderByWithRelationInput =
    { created_at: "desc" };

  if (props.body.sortBy) {
    const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
    if (props.body.sortBy === "name") {
      orderBy = { childCategory: { name: sortOrder } };
    } else {
      orderBy = { [props.body.sortBy]: sortOrder };
    }
  }

  const [data, totalCount] = await Promise.all([
    MyGlobal.prisma.shopping_mall_category_hierarchies.findMany({
      where: {
        parentCategory: { id: parentCategory.id },
        childCategory: childCategoryWhere,
      },
      include: { childCategory: true },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_category_hierarchies.count({
      where: {
        parentCategory: { id: parentCategory.id },
        childCategory: childCategoryWhere,
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      parent_category: {
        id: parentCategory.id,
        name: parentCategory.name,
        status: parentCategory.status,
        description: parentCategory.description ?? undefined,
        created_at: toISOStringSafe(parentCategory.created_at),
        updated_at: toISOStringSafe(parentCategory.updated_at),
        deleted_at:
          parentCategory.deleted_at === null
            ? null
            : toISOStringSafe(parentCategory.deleted_at),
      },
      child_category: {
        id: record.childCategory.id,
        name: record.childCategory.name,
        status: record.childCategory.status,
        description: record.childCategory.description ?? undefined,
        created_at: toISOStringSafe(record.childCategory.created_at),
        updated_at: toISOStringSafe(record.childCategory.updated_at),
        deleted_at:
          record.childCategory.deleted_at === null
            ? null
            : toISOStringSafe(record.childCategory.deleted_at),
      },
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
