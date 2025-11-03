import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProductCategories(props: {
  seller: SellerPayload;
  body: IShoppingMallProductCategory.ICreate;
}): Promise<IShoppingMallProductCategory> {
  const { body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_product_categories.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        parent_id: body.parent_id === undefined ? null : body.parent_id,
        name: body.name,
        description: body.description === undefined ? null : body.description,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        parent_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );

  return {
    id: created.id,
    parent_id: created.parent_id ?? null,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
