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

export async function deleteShoppingMallAdminCategoriesCategoryIdSubcategoriesSubcategoryId(props: {
  admin: AdminPayload;
  categoryId: string;
  subcategoryId: string;
}): Promise<void> {
  const subcategory =
    await MyGlobal.prisma.shopping_mall_subcategories.findUnique({
      where: {
        id: props.subcategoryId,
        shopping_mall_category_id: props.categoryId,
      },
    });
  if (subcategory === null || subcategory.deleted_at !== null) {
    throw new HttpException("Subcategory not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_subcategories.update({
    where: {
      id: subcategory.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
}
