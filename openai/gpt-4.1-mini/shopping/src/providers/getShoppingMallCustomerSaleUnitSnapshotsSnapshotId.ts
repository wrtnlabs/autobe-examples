import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSaleUnitSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleUnitSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (record === null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: record.id,
    sku_code: record.sku_code,
    option_values: record.option_values,
    price_override:
      record.price_override === null ? undefined : record.price_override,
    stock_quantity: record.stock_quantity,
    is_active: record.is_active,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
