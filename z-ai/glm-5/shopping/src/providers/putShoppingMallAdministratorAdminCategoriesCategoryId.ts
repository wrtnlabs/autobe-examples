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

export async function putShoppingMallAdministratorAdminCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategory.IUpdate;
}): Promise<IShoppingMallCategory> {
  // Verify category exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
      deleted_at: null,
    },
  });
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.shopping_mall_categories.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.categoryId },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException("Category name already exists", 409);
    }
  }
  // Update category with partial data
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
  // Fetch and return updated category using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.categoryId },
      ...ShoppingMallCategoryTransformer.select(),
    });
  return await ShoppingMallCategoryTransformer.transform(updated);
}
