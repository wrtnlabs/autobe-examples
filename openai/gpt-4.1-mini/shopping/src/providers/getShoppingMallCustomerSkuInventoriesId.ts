import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerSkuInventoriesId(props: {
  customer: CustomerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSkuInventory> {
  try {
    const record =
      await MyGlobal.prisma.shopping_mall_sku_inventories.findUniqueOrThrow({
        where: { id: props.id },
      });

    return {
      id: record.id,
      shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
      quantity: record.quantity,
      stock_status: typia.assert<"in stock" | "out of stock" | "backordered">(
        record.stock_status,
      ),
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch {
    throw new HttpException("Not Found", 404);
  }
}
