import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryHistory";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function patchShoppingMallSellerInventoryHistories(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryHistory.IRequest;
}): Promise<IPageIShoppingMallInventoryHistory.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined &&
    props.body.limit >= 1 &&
    props.body.limit <= 100
      ? props.body.limit
      : 100;
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.startDate) {
    createdAtFilter.gte = props.body.startDate;
  }
  if (props.body.endDate) {
    createdAtFilter.lte = props.body.endDate;
  }
  const where: Prisma.shopping_mall_inventory_historiesWhereInput = {
    deleted_at: null,
    ...(props.body.shoppingMallProductVariantId
      ? {
          shopping_mall_product_variant_id:
            props.body.shoppingMallProductVariantId,
        }
      : {}),
    ...(props.body.reason ? { reason: props.body.reason } : {}),
    ...(Object.keys(createdAtFilter).length
      ? { created_at: createdAtFilter }
      : {}),
  };
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_histories.count({ where }),
    MyGlobal.prisma.shopping_mall_inventory_histories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity_delta: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            price_override: true,
            stock_quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id,
      shoppingMallProductVariantId: record.shopping_mall_product_variant_id,
      productVariant: {
        id: record.productVariant.id,
        skuCode: record.productVariant.sku_code,
        priceOverride: record.productVariant.price_override ?? null,
        stockQuantity: record.productVariant.stock_quantity,
        createdAt: toISOStringSafe(record.productVariant.created_at),
        updatedAt: toISOStringSafe(record.productVariant.updated_at),
        deletedAt: record.productVariant.deleted_at
          ? toISOStringSafe(record.productVariant.deleted_at)
          : null,
      },
      quantityDelta: record.quantity_delta,
      reason: record.reason,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
