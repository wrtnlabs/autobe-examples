import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSaleSnapshotCollector } from "../collectors/ShoppingMallSaleSnapshotCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSaleSnapshots(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleSnapshot.ICreate;
}): Promise<IShoppingMallSaleSnapshot> {
  // Validate referenced sale exists to ensure relational integrity
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { id: (props.body as any).shoppingMallSaleId ?? "" },
  });
  if (!sale) throw new HttpException("Sale not found", 404);
  const data = await ShoppingMallSaleSnapshotCollector.collect({
    body: props.body as any,
    sale,
  });
  const created = await MyGlobal.prisma.shopping_mall_sale_snapshots.create({
    data,
  });
  return {
    id: created.id,
    shoppingMallSaleId: created.shopping_mall_sale_id,
    title: created.title,
    description: created.description,
    categoryId: created.category_id,
    basePrice: created.base_price,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
    deletedAt: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
