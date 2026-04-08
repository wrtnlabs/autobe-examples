import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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

export async function patchEcommerceMallSellerInventories(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    productVariant: {
      product: {
        ecommerce_mall_seller_id: props.seller.id,
      },
    },
    ...(props.body.variantId !== undefined && {
      ecommerce_mall_product_variant_id: props.body.variantId,
    }),
    ...(props.body.reason !== undefined && {
      reason: props.body.reason,
    }),
    ...(props.body.fromDate !== undefined &&
      props.body.toDate !== undefined && {
        created_at: {
          gte: new Date(props.body.fromDate),
          lte: new Date(props.body.toDate),
        },
      }),
    ...(props.body.fromDate !== undefined &&
      props.body.toDate === undefined && {
        created_at: {
          gte: new Date(props.body.fromDate),
        },
      }),
    ...(props.body.fromDate === undefined &&
      props.body.toDate !== undefined && {
        created_at: {
          lte: new Date(props.body.toDate),
        },
      }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      quantity_change: true,
      reason: true,
      created_at: true,
      productVariant: {
        select: {
          sku_code: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      pagination: {
        current: page satisfies number as number,
        limit: limit satisfies number as number,
        records: total satisfies number as number,
        pages: totalPages satisfies number as number,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIEcommerceMall.IPagination,
    data: data.map(
      (record): IEcommerceMallInventoryRecord => ({
        totalVariantsCount: 0,
        totalStockQuantity: 0,
        totalStockValue: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        inStockCount: 0,
        lowStockVariants: [],
        recentChanges: [
          {
            quantityChange: record.quantity_change,
            reason: record.reason,
            createdAt: record.created_at.toISOString(),
            variantSku: record.productVariant.sku_code,
            productName: record.productVariant.product.name,
          } satisfies IEcommerceMallInventoryRecord.IRecentChange,
        ],
      }),
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
// import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerInventories(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallInventoryRecord.IRequest;
// }): Promise<IPageIEcommerceMallInventoryRecord> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------