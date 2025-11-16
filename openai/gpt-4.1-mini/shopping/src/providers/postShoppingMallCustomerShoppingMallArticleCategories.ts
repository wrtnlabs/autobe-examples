import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerShoppingMallArticleCategories(props: {
  customer: CustomerPayload;
  body: IShoppingMallArticleCategory.ICreate;
}): Promise<IShoppingMallArticleCategory> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.shopping_mall_article_categories.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: props.body.name,
        description: props.body.description ?? null,
        parent_id: props.body.parent_id ?? null,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    name: created.name,
    description: created.description ?? null,
    parent_id: created.parent_id ?? null,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at:
      created.updated_at === null
        ? null
        : (toISOStringSafe(created.updated_at) as string &
            tags.Format<"date-time">),
  };
}
