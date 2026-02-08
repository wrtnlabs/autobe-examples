import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function getShoppingMallAdministratorProductVariantSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const record =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!record) {
    throw new HttpException("Product variant snapshot not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_product_variant_id: record.shopping_mall_product_variant_id,
    sku_code: record.sku_code,
    option_values: record.option_values,
    price_override: record.price_override,
    stock_quantity: record.stock_quantity,
    created_at: toISOStringSafe(record.created_at),
  };
}
