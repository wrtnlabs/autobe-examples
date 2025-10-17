import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  const { admin, categoryId, body } = props;

  const existingCategory =
    await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        id: categoryId,
        deleted_at: null,
      },
    });

  if (!existingCategory) {
    throw new HttpException("Category not found", 404);
  }

  const updatedCategory = await MyGlobal.prisma.shopping_mall_categories.update(
    {
      where: { id: categoryId },
      data: {
        name: body.name ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
  };
}
