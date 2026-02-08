import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSale> {
  const record = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: props.saleId, deleted_at: null },
    select: {
      id: true,
      seller_id: true,
      category_id: true,
      name: true,
      description: true,
      base_price: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (record === null) {
    throw new HttpException("Sale not found", 404);
  }
  return {
    id: record.id,
    seller_id: record.seller_id,
    category_id: record.category_id,
    name: record.name,
    description: record.description,
    base_price: record.base_price,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
