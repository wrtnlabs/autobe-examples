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
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_categories.findFirstOrThrow({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
      },
    });
    if (props.body.parent_id === props.categoryId) {
      throw new HttpException("A category cannot be its own parent.", 400);
    }
    if (props.body.parent_id !== null) {
      const parent = await prisma.shopping_mall_categories.findFirstOrThrow({
        where: {
          id: props.body.parent_id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_id: true,
        },
      });
      if (parent.parent_id !== null) {
        throw new HttpException(
          "Category nesting cannot exceed one level.",
          400,
        );
      }
    }
    const duplicated = await prisma.shopping_mall_categories.findFirst({
      where: {
        id: {
          not: props.categoryId,
        },
        parent_id: props.body.parent_id,
        name: props.body.name,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (duplicated !== null) {
      throw new HttpException(
        "A category with the same name already exists in this scope.",
        409,
      );
    }
    await prisma.shopping_mall_categories.update({
      where: {
        id: props.categoryId,
      },
      data: {
        name: props.body.name,
        description: props.body.description,
        parent_id: props.body.parent_id,
        updated_at: new Date(),
      },
    });
    return prisma.shopping_mall_categories.findUniqueOrThrow({
      where: {
        id: props.categoryId,
      },
      ...ShoppingMallCategoryTransformer.select(),
    });
  });
  return ShoppingMallCategoryTransformer.transform(updated);
}
