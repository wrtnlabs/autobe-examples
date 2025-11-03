import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import { IPageIShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallStockAdjustment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminStockAdjustments(props: {
  admin: AdminPayload;
  body: IShoppingMallStockAdjustment.IRequest;
}): Promise<IPageIShoppingMallStockAdjustment.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.shopping_mall_product_sku_id !== undefined &&
      body.shopping_mall_product_sku_id !== null && {
        shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      }),
    ...(body.adjustment_type !== undefined &&
      body.adjustment_type !== null && {
        adjustment_type: body.adjustment_type,
      }),
    ...(body.actor_type !== undefined &&
      body.actor_type !== null && {
        actor_type: body.actor_type,
      }),
    ...(body.actor_id !== undefined &&
      body.actor_id !== null && {
        actor_id: body.actor_id,
      }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_stock_adjustments.findMany({
      where,
      include: {
        productSku: true,
      },
      orderBy: body.sort_by
        ? {
            [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc",
          }
        : { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_stock_adjustments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
      adjustment_type: record.adjustment_type,
      quantity: record.quantity,
      actor_type: record.actor_type,
      actor_id: record.actor_id,
      created_at: toISOStringSafe(record.created_at),
      productSku: {
        id: record.productSku.id,
        sku_code: record.productSku.sku_code,
        price: record.productSku.price,
        attributes_json: record.productSku.attributes_json ?? null,
        created_at: toISOStringSafe(record.productSku.created_at),
        updated_at: toISOStringSafe(record.productSku.updated_at),
      },
    })),
  };
}
