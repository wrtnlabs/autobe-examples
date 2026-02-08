import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantSnapshotCollector } from "../collectors/ShoppingMallProductVariantSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorProductVariantSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallProductVariantSnapshot.ICreate;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const data = await ShoppingMallProductVariantSnapshotCollector.collect({
    body: props.body as unknown as {
      sku_code: string;
      option_values: string;
      price_override?: number | null | undefined;
      stock_quantity: number;
      productVariantId: string;
    },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
      data: {
        ...data,
        created_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: created.id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    sku_code: created.sku_code,
    option_values: created.option_values,
    price_override: created.price_override,
    stock_quantity: created.stock_quantity,
    created_at: toISOStringSafe(created.created_at),
  };
}
