import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
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

export async function getShoppingMallAdministratorSaleUnitSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleUnitSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findUnique({
      where: { id: props.snapshotId },
      select: {
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!snapshot) {
    throw new HttpException("Snapshot not found", 404);
  }
  return {
    sku_code: snapshot.sku_code,
    option_values:
      snapshot.option_values === null ? undefined : snapshot.option_values,
    price_override:
      snapshot.price_override === null ? undefined : snapshot.price_override,
    stock_quantity: snapshot.stock_quantity,
    is_active: snapshot.is_active,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
  };
}
