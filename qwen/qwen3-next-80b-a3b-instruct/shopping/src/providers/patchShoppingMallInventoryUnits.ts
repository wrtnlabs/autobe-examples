import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryUnit";
import { IPageIShoppingMallInventoryUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryUnit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function patchShoppingMallInventoryUnits(props: {
  body: IShoppingMallInventoryUnit.IRequest;
}): Promise<IPageIShoppingMallInventoryUnit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  // Apply optional filters
  if (props.body.product_variant_id) {
    whereCondition.product_variant_id = props.body.product_variant_id;
  }

  if (props.body.seller_id) {
    whereCondition.seller_id = props.body.seller_id;
  }

  if (props.body.quantity !== undefined) {
    // For quantity, treat positive as >=, negative as <=
    if (props.body.quantity >= 0) {
      whereCondition.quantity = { gte: props.body.quantity };
    } else {
      whereCondition.quantity = { lte: Math.abs(props.body.quantity) };
    }
  }

  if (props.body.min_stock_threshold !== undefined) {
    whereCondition.min_stock_threshold = props.body.min_stock_threshold;
  }

  if (props.body.last_updated) {
    whereCondition.last_updated = { gte: props.body.last_updated };
  }

  // Apply default sort
  const orderBy: { [key: string]: "asc" | "desc" } = {
    last_updated: "desc",
  };

  const [inventoryUnits, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_units.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        productVariant: {
          select: {
            id: true,
            title: true,
            price: true,
            sku: true,
            inventory_count: true,
            attributes: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_units.count({
      where: whereCondition,
    }),
  ]);

  const data = inventoryUnits.map((unit) => ({
    product_variant: {
      id: unit.productVariant.id,
      title: unit.productVariant.title,
      price: unit.productVariant.price,
      sku: unit.productVariant.sku,
      inventory_count: unit.productVariant.inventory_count,
      attributes: unit.productVariant.attributes,
      created_at: toISOStringSafe(unit.productVariant.created_at),
      updated_at: toISOStringSafe(unit.productVariant.updated_at),
      deleted_at: unit.productVariant.deleted_at
        ? toISOStringSafe(unit.productVariant.deleted_at)
        : null,
    },
    seller: unit.seller.id, // Correct: returns string per ISummary definition
    quantity: unit.quantity,
    min_stock_threshold: unit.min_stock_threshold,
    warehouse_location: undefined,
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
