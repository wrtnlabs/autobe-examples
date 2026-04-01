import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCategoryCollector } from "../collectors/ShoppingMallCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCategoryTransformer } from "../transformers/ShoppingMallCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCategories(props: {
  admin: AdminPayload;
  body: IShoppingMallCategory.ICreate;
}): Promise<IShoppingMallCategory> {
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.parent_category_id !== undefined &&
    props.body.parent_category_id !== null
  ) {
    const parent = await MyGlobal.prisma.shopping_mall_categories.findUnique({
      where: { id: props.body.parent_category_id },
      select: {
        id: true,
        parent_category_id: true,
        deleted_at: true,
      },
    });
    if (parent === null || parent.deleted_at !== null) {
      throw new HttpException("Parent category not found", 400);
    }
    if (parent.parent_category_id !== null) {
      throw new HttpException("One-level nesting rule violated", 400);
    }
  }
  try {
    const created = await MyGlobal.prisma.shopping_mall_categories.create({
      data: await ShoppingMallCategoryCollector.collect({ body: props.body }),
      select: ShoppingMallCategoryTransformer.select().select,
    });
    return await ShoppingMallCategoryTransformer.transform(created);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("Slug already exists", 409);
    }
    throw e;
  }
}
