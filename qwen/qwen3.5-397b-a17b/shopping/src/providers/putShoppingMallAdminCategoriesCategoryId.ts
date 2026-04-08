import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminCategoriesCategoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  if (props.body.name !== undefined) {
    const conflict = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        id: { not: props.categoryId },
      },
    });
    if (conflict) {
      throw new HttpException("Category name already exists", 409);
    }
  }
  await MyGlobal.prisma.shopping_mall_categories.update({
    where: { id: props.categoryId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(updated);
}
