import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function getShoppingMallSellerVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  variantId: string;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { shopping_mall_product_id: true },
    });
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: {
        productSnapshot: {
          shopping_mall_product_id: variant.shopping_mall_product_id,
        },
      },
      orderBy: { created_at: "desc" },
      skip: 0,
      take: 100,
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: {
        productSnapshot: {
          shopping_mall_product_id: variant.shopping_mall_product_id,
        },
      },
    });
  return {
    data: snapshots.map((s) => {
      const created_at = toISOStringSafe(s.created_at);
      const updated_at = toISOStringSafe(s.updated_at);
      return {
        id: s.id,
        sku_code: s.sku_code,
        option_values_json: s.option_values_json,
        price_override: s.price_override,
        stock_quantity: s.stock_quantity,
        created_at: created_at as string & tags.Format<"date-time">,
        updated_at: updated_at as string & tags.Format<"date-time">,
      } satisfies IShoppingMallProductVariantSnapshot.ISummary;
    }),
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductVariantSnapshot.ISummary;
}
