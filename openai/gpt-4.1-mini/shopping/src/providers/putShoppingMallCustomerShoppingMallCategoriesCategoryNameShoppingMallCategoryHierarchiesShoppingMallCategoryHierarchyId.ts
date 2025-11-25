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

export async function putShoppingMallCustomerShoppingMallCategoriesCategoryNameShoppingMallCategoryHierarchiesShoppingMallCategoryHierarchyId(props: {
  customer: CustomerPayload;
  categoryName: string;
  shoppingMallCategoryHierarchyId: string & tags.Format<"uuid">;
  body: IShoppingMallCategoryHierarchy.IUpdate;
}): Promise<IShoppingMallCategoryHierarchy> {
  const existing =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.findUnique({
      where: { id: props.shoppingMallCategoryHierarchyId },
    });

  if (!existing) {
    throw new HttpException("Category hierarchy link not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { name: props.categoryName },
  });

  const updated =
    await MyGlobal.prisma.shopping_mall_category_hierarchies.update({
      where: { id: props.shoppingMallCategoryHierarchyId },
      data: {
        parent_category_id: props.body.parent_category_name,
        child_category_id: props.body.child_category_name,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    parent_category_name: props.body.parent_category_name,
    child_category_name: props.body.child_category_name,
    display_order: props.body.display_order ?? undefined,
    is_active: props.body.is_active ?? true,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
  };
}
