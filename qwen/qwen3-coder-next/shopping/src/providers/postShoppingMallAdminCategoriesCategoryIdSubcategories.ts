import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
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

export async function postShoppingMallAdminCategoriesCategoryIdSubcategories(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallSubcategory.ICreate;
}): Promise<IShoppingMallSubcategory> {
  // Verify parent category exists and is not deleted
  const category = await MyGlobal.prisma.shopping_mall_categories.findUnique({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  if (!category) {
    throw new HttpException("Parent category not found", 404);
  }
  // Extract properties from body (using index signature for ICreate compatibility)
  const createData = props.body as any;
  // Check that subcategory name is unique within the parent category scope
  const existingSubcategory =
    await MyGlobal.prisma.shopping_mall_subcategories.findFirst({
      where: {
        shopping_mall_category_id: props.categoryId,
        name: createData.name,
        deleted_at: null,
      },
    });
  if (existingSubcategory) {
    throw new HttpException(
      "Subcategory with this name already exists in this category",
      409,
    );
  }
  // Create new subcategory record
  const subcategory = await MyGlobal.prisma.shopping_mall_subcategories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: createData.name,
      description: createData.description,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
      category: {
        connect: {
          id: props.categoryId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      shopping_mall_category_id: true,
    },
  });
  // Transform to response DTO format
  return {
    id: subcategory.id,
    name: subcategory.name,
    description: subcategory.description,
    created_at: subcategory.created_at,
    updated_at: subcategory.updated_at,
    shopping_mall_category_id: subcategory.shopping_mall_category_id,
  };
}
