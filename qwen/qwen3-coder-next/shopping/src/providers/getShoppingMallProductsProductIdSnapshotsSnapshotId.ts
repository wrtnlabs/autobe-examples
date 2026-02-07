import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductIdSnapshotsSnapshotId(props: {
  productId: string;
  snapshotId: string;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
        created_at: true,
        edited_by_id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        published: true,
        stock_quantity: true,
      },
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_product_id: snapshot.shopping_mall_product_id,
    created_at: toISOStringSafe(snapshot.created_at),
    edited_by_id: snapshot.edited_by_id,
    name: snapshot.name,
    description: snapshot.description,
    category_id: snapshot.category_id,
    base_price: snapshot.base_price,
    published: snapshot.published,
    stock_quantity: snapshot.stock_quantity,
  };
}
