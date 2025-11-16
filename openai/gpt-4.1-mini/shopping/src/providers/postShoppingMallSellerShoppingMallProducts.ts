import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerShoppingMallProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: props.seller.id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description ?? null,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    code: created.code,
    name: created.name,
    description: created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
