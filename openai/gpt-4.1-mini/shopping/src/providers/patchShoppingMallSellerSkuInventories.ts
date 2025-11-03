import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";
import { IPageIShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSkuInventories(props: {
  seller: SellerPayload;
  body: IShoppingMallSkuInventory.IRequest;
}): Promise<IPageIShoppingMallSkuInventory.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_sku_inventoriesWhereInput = {
    deleted_at: null,
    ...(body.shopping_mall_product_sku_code !== undefined &&
      body.shopping_mall_product_sku_code !== null && {
        productSku: {
          sku_code: {
            contains: body.shopping_mall_product_sku_code,
          },
        },
      }),
    ...(body.stock_status !== undefined &&
      body.stock_status !== null && {
        stock_status: {
          contains: body.stock_status,
        },
      }),
    ...(body.min_quantity !== undefined &&
      body.min_quantity !== null && {
        quantity: {
          gte: body.min_quantity,
        },
      }),
    ...(body.max_quantity !== undefined &&
      body.max_quantity !== null && {
        quantity: {
          lte: body.max_quantity,
        },
      }),
    ...(body.date_from !== undefined &&
      body.date_from !== null && {
        updated_at: {
          gte: body.date_from,
        },
      }),
    ...(body.date_to !== undefined &&
      body.date_to !== null && {
        updated_at: {
          lte: body.date_to,
        },
      }),
  };

  const orderBy: Prisma.shopping_mall_sku_inventoriesOrderByWithRelationInput =
    body.sort_by !== null && body.sort_by !== undefined
      ? {
          [body.sort_by]: (body.order !== null &&
          body.order !== undefined &&
          (body.order === "asc" || body.order === "desc")
            ? body.order
            : "asc") satisfies Prisma.SortOrder,
        }
      : ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_sku_inventoriesOrderByWithRelationInput);

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sku_inventories.findMany({
      where,
      include: {
        productSku: true,
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_sku_inventories.count({ where }),
  ]);

  type ResultType = (typeof results)[number] & {
    productSku: {
      id: string & tags.Format<"uuid">;
      sku_code: string;
      price: number & tags.Type<"double"> & tags.Minimum<0>;
      attributes_json: string | null;
      created_at: string & tags.Format<"date-time">;
      updated_at: string & tags.Format<"date-time">;
    };
    shopping_mall_stock_adjustments: {
      id: string & tags.Format<"uuid">;
      shopping_mall_product_sku_id: string & tags.Format<"uuid">;
      adjustment_type: string;
      quantity: number & tags.Type<"int32"> & tags.Minimum<0>;
      actor_type: string;
      actor_id: string & tags.Format<"uuid">;
      created_at: string & tags.Format<"date-time">;
      productSku: {
        id: string & tags.Format<"uuid">;
        sku_code: string;
        price: number & tags.Type<"double"> & tags.Minimum<0>;
        attributes_json: string | null;
        created_at: string & tags.Format<"date-time">;
        updated_at: string & tags.Format<"date-time">;
      };
    }[];
    shopping_mall_low_stock_alerts: {
      id: string & tags.Format<"uuid">;
      shopping_mall_product_sku_id: string & tags.Format<"uuid">;
      alerted_at: string & tags.Format<"date-time">;
      resolved: boolean;
      resolved_at: (string & tags.Format<"date-time">) | null;
    }[];
  };

  const typedResults = results as ResultType[];

  const data = typedResults.map((record) => ({
    id: record.id,
    shopping_mall_product_sku_id: record.shopping_mall_product_sku_id,
    quantity: record.quantity,
    stock_status: record.stock_status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
    productSku: {
      id: record.productSku.id,
      sku_code: record.productSku.sku_code,
      price: record.productSku.price,
      attributes_json: record.productSku.attributes_json ?? null,
      created_at: toISOStringSafe(record.productSku.created_at),
      updated_at: toISOStringSafe(record.productSku.updated_at),
    },
    stockAdjustmentsCount: record.shopping_mall_stock_adjustments.length,
    lowStockAlertsCount: record.shopping_mall_low_stock_alerts.length,
    latestStockAdjustment:
      record.shopping_mall_stock_adjustments.length > 0
        ? {
            id: record.shopping_mall_stock_adjustments[0].id,
            shopping_mall_product_sku_id:
              record.shopping_mall_stock_adjustments[0]
                .shopping_mall_product_sku_id,
            adjustment_type:
              record.shopping_mall_stock_adjustments[0].adjustment_type,
            quantity: record.shopping_mall_stock_adjustments[0].quantity,
            actor_type: record.shopping_mall_stock_adjustments[0].actor_type,
            actor_id: record.shopping_mall_stock_adjustments[0].actor_id,
            created_at: toISOStringSafe(
              record.shopping_mall_stock_adjustments[0].created_at,
            ),
            productSku: {
              id: record.shopping_mall_stock_adjustments[0].productSku.id,
              sku_code:
                record.shopping_mall_stock_adjustments[0].productSku.sku_code,
              price: record.shopping_mall_stock_adjustments[0].productSku.price,
              attributes_json:
                record.shopping_mall_stock_adjustments[0].productSku
                  .attributes_json ?? null,
              created_at: toISOStringSafe(
                record.shopping_mall_stock_adjustments[0].productSku.created_at,
              ),
              updated_at: toISOStringSafe(
                record.shopping_mall_stock_adjustments[0].productSku.updated_at,
              ),
            },
          }
        : undefined,
    latestLowStockAlert:
      record.shopping_mall_low_stock_alerts.length > 0
        ? {
            id: record.shopping_mall_low_stock_alerts[0].id,
            shopping_mall_product_sku_id:
              record.shopping_mall_low_stock_alerts[0]
                .shopping_mall_product_sku_id,
            alerted_at: toISOStringSafe(
              record.shopping_mall_low_stock_alerts[0].alerted_at,
            ),
            resolved: record.shopping_mall_low_stock_alerts[0].resolved,
            resolved_at: record.shopping_mall_low_stock_alerts[0].resolved_at
              ? toISOStringSafe(
                  record.shopping_mall_low_stock_alerts[0].resolved_at,
                )
              : null,
          }
        : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
