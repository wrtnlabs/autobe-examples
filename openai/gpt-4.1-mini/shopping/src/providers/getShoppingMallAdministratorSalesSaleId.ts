import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSalesSaleId(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSale> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
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
  if (!sale) throw new HttpException("Sale not found", 404);
  return {
    id: sale.id,
    seller_id: sale.seller_id,
    category_id: sale.category_id,
    name: sale.name,
    description: sale.description,
    base_price: sale.base_price,
    status: sale.status,
    created_at: toISOStringSafe(sale.created_at),
    updated_at: toISOStringSafe(sale.updated_at),
  };
}
