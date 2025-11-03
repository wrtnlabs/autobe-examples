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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerStockAdjustments(props: {
  seller: SellerPayload;
  body: IShoppingMallStockAdjustment.IRequest;
}): Promise<IPageIShoppingMallStockAdjustment.ISummary> {
  const { seller, body } = props;

  const allowedSortFields = [
    "created_at",
    "quantity",
    "adjustment_type",
    "actor_type",
  ] as const;
  const allowedSortOrders = ["asc", "desc"] as const;

  // Normalize pagination
  const page = body.page === undefined ? 1 : body.page;
  const limit = body.limit === undefined ? 10 : body.limit;
  const skip = (page - 1) * limit;

  // Validate sort field
  const sortBy = body.sort_by ?? "created_at";
  if (!allowedSortFields.includes(sortBy)) {
    throw new HttpException(`Invalid sort_by: ${sortBy}`, 400);
  }

  // Validate order
  const sortOrder = body.sort_order ?? "desc";
  if (!allowedSortOrders.includes(sortOrder)) {
    throw new HttpException(`Invalid sort_order: ${sortOrder}`, 400);
  }

  // Build where condition
  const where: {
    shopping_mall_product_sku_id?: string & tags.Format<"uuid">;
    adjustment_type?: string;
    actor_type?: string;
    actor_id?: string & tags.Format<"uuid">;
  } = {};

  if (body.shopping_mall_product_sku_id !== undefined) {
    where.shopping_mall_product_sku_id = body.shopping_mall_product_sku_id;
  }
  if (body.adjustment_type !== undefined) {
    where.adjustment_type = body.adjustment_type;
  }
  if (body.actor_type !== undefined) {
    where.actor_type = body.actor_type;
  }
  if (body.actor_id !== undefined) {
    where.actor_id = body.actor_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_stock_adjustments.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      include: {
        productSku: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            attributes_json: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
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
    data: results.map((item) => ({
      id: item.id,
      shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
      adjustment_type: item.adjustment_type,
      quantity: item.quantity,
      actor_type: item.actor_type,
      actor_id: item.actor_id,
      created_at: toISOStringSafe(item.created_at),
      productSku: {
        id: item.productSku.id,
        sku_code: item.productSku.sku_code,
        price: item.productSku.price,
        attributes_json: item.productSku.attributes_json ?? undefined,
        created_at: toISOStringSafe(item.productSku.created_at),
        updated_at: toISOStringSafe(item.productSku.updated_at),
      },
    })),
  };
}
