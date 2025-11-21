import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallCategories(props: {
  body: IShoppingMallCategory.IRequest;
}): Promise<IPageIShoppingMallCategory.ISummary> {
  const page = props.body.page;
  const limit = Math.min(props.body.limit, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;

  // Build where conditions for filtering
  const whereConditions: Prisma.shopping_mall_categoriesWhereInput = {
    deleted_at: null, // Only non-deleted categories
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.parent_category_id !== undefined && {
      parent_id: props.body.parent_category_id,
    }),
    ...(props.body.active !== undefined && {
      active: props.body.active,
    }),
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
  };

  // Determine sorting
  const orderBy: Prisma.shopping_mall_categoriesOrderByWithRelationInput = {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";
    switch (props.body.order_by) {
      case "display_order":
        orderBy.display_order = direction;
        break;
      case "name":
        orderBy.name = direction;
        break;
      case "created_at":
        orderBy.created_at = direction;
        break;
    }
  } else {
    // Default sorting
    orderBy.display_order = "asc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_categories.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        parent: {
          where: { deleted_at: null }, // Only include non-deleted parent categories
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_categories.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match API contract
  const transformedData = data.map((category) => {
    const parent = category.parent;
    return {
      id: category.id as string & tags.Format<"uuid">,
      name: category.name,
      description: category.description ?? undefined,
      display_order: category.display_order,
      active: category.active,
      parent_id: category.parent_id
        ? (category.parent_id as string & tags.Format<"uuid">)
        : (v4() as string & tags.Format<"uuid">), // Fallback for null parent_id
      created_at: toISOStringSafe(category.created_at),
      updated_at: toISOStringSafe(category.updated_at),
      parent: parent
        ? {
            id: parent.id as string & tags.Format<"uuid">,
            name: parent.name,
            description: parent.description ?? undefined,
            display_order: parent.display_order,
            active: parent.active,
            parent_id: parent.parent_id
              ? (parent.parent_id as string & tags.Format<"uuid">)
              : (v4() as string & tags.Format<"uuid">), // Fallback for null parent_id
            created_at: toISOStringSafe(parent.created_at),
            updated_at: toISOStringSafe(parent.updated_at),
            parent: undefined, // Avoid infinite recursion
          }
        : undefined,
    };
  });

  return {
    pagination: {
      current: page satisfies number as number,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
