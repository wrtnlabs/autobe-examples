import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategoryHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryHierarchy";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallCategoriesCategoryNameShoppingMallCategoryHierarchies(props: {
  customer: CustomerPayload;
  categoryName: string;
  body: IShoppingMallCategoryHierarchy.ICreate;
}): Promise<IShoppingMallCategoryHierarchy> {
  const parentCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: {
        name: props.categoryName,
      },
    });
  if (!parentCategory) {
    throw new HttpException(
      `Parent category '${props.categoryName}' not found`,
      404,
    );
  }

  const childCategory =
    await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: {
        id: props.body.child_category_id,
      },
    });
  if (!childCategory) {
    throw new HttpException(
      `Child category with id '${props.body.child_category_id}' not found`,
      404,
    );
  }

  const existingLink =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.findUnique({
      where: {
        parent_category_id_child_category_id: {
          parent_category_id: parentCategory.id,
          child_category_id: childCategory.id,
        },
      },
    });
  if (existingLink) {
    throw new HttpException("Hierarchy link already exists", 400);
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        parent_category_id: parentCategory.id,
        child_category_id: childCategory.id,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    parent_category_name: parentCategory.name,
    child_category_name: childCategory.name,
    display_order: undefined,
    is_active: true,
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
    notes: undefined,
  };
}
