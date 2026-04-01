import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function patchShoppingMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    productVariant: {
      product: {
        seller_id: props.seller.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    ...(props.body.productVariantId && {
      product_variant_id: props.body.productVariantId,
    }),
    ...(props.body.reason && {
      reason: {
        contains: props.body.reason,
      },
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      quantity_change: true,
      reason: true,
      created_at: true,
      productVariant: {
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name: true,
              base_price: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((record) => ({
      id: record.id,
      quantity_change: record.quantity_change,
      reason: record.reason,
      created_at: toISOStringSafe(record.created_at),
      productVariant: {
        id: record.productVariant.id,
        sku_code: record.productVariant.sku_code,
        price_override: record.productVariant.price_override,
        created_at: toISOStringSafe(record.productVariant.created_at),
        product: {
          min: record.productVariant.product.base_price,
          max: record.productVariant.product.base_price,
        } satisfies IShoppingMallProduct.ISummary,
      } satisfies IShoppingMallProductVariant.ISummary,
    })),
  };
}
