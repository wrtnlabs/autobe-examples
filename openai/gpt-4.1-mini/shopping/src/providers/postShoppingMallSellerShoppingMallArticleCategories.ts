import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallArticleCategories(props: {
  seller: SellerPayload;
  body: IShoppingMallArticleCategory.ICreate;
}): Promise<IShoppingMallArticleCategory> {
  const created = await MyGlobal.prisma.shopping_mall_article_categories.create(
    {
      data: {
        id: v4(),
        name: props.body.name,
        description: props.body.description ?? null,
        parent_id: props.body.parent_id ?? null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: created.id,
    name: created.name,
    description: created.description,
    parent_id: created.parent_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at:
      created.updated_at === null ? null : toISOStringSafe(created.updated_at),
  };
}
