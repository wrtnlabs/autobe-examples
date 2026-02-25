import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const category = await prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      select: { id: true, parent_category_id: true },
    });
    if (props.body.name !== undefined) {
      const existingWithName = await prisma.shopping_mall_categories.findFirst({
        where: {
          parent_category_id: category.parent_category_id,
          name: props.body.name,
          id: { not: props.categoryId },
          deleted_at: null,
        },
      });
      if (existingWithName !== null) {
        throw new HttpException(
          "Category name must be unique under the same parent category",
          400,
        );
      }
    }
    const updatedAtStr = new Date().toISOString() as string &
      tags.Format<"date-time">;
    const updated = await prisma.shopping_mall_categories.update({
      where: { id: props.categoryId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: updatedAtStr as unknown as Date,
      },
      ...ShoppingMallCategoryTransformer.select(),
    });
    return await ShoppingMallCategoryTransformer.transform(updated);
  });
}
