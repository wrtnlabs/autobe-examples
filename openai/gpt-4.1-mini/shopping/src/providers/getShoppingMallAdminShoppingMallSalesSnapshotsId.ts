import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSalesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallSalesSnapshotsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSalesSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_sales_snapshots.findUnique({
      where: { id: props.id },
    });

  if (!snapshot) {
    throw new HttpException("Sales snapshot not found", 404);
  }

  return {
    id: snapshot.id,
    shopping_mall_product_id: snapshot.shopping_mall_product_id,
    shopping_mall_product_sku_id: snapshot.shopping_mall_product_sku_id,
    price_at_snapshot: snapshot.price_at_snapshot,
    inventory_at_snapshot: snapshot.inventory_at_snapshot,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
