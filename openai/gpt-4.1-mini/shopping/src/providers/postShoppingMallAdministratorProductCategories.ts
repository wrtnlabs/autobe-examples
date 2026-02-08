import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCategoryCollector } from "../collectors/ShoppingMallProductCategoryCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductCategories(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductCategory.ICreate;
}): Promise<IShoppingMallProductCategory> {
  const exists =
    await MyGlobal.prisma.shopping_mall_product_categories.findFirst({
      where: { name: (props.body as any).name, deleted_at: null },
    });
  if (exists !== null) {
    throw new HttpException("Category name already exists", 400);
  }
  const id = v4();
  const now = toISOStringSafe(new Date());
  const data = await ShoppingMallProductCategoryCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.shopping_mall_product_categories.create(
    {
      data: {
        ...data,
        id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? null,
    created_at:
      typeof created.created_at === "string"
        ? created.created_at
        : toISOStringSafe(new Date(created.created_at)),
    updated_at:
      typeof created.updated_at === "string"
        ? created.updated_at
        : toISOStringSafe(new Date(created.updated_at)),
    deleted_at:
      created.deleted_at === null
        ? null
        : typeof created.deleted_at === "string"
          ? created.deleted_at
          : toISOStringSafe(new Date(created.deleted_at)),
  };
}
