import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallProductAtSummaryTransformer } from "../transformers/ECommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerSearchProducts(props: {
  customer: CustomerPayload;
  body: IECommerceMallProduct.IRequest;
}): Promise<IPageIECommerceMallProduct.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build base WHERE for visible, non-deleted products from non-deleted sellers
  const where: Prisma.e_commerce_mall_productsWhereInput = {
    visibility: "visible",
    deleted_at: null,
    seller: {
      deleted_at: null,
    },
  };
  // Search filter: case-insensitive pattern matching on product name
  if (props.body.search !== undefined && props.body.search !== "") {
    where.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Category filter: exact UUID match
  if (props.body.categoryId !== undefined) {
    where.category_id = props.body.categoryId;
  }
  // Phase 1: Fetch ALL matching products with variant + inventory data
  // for effective price computation and stock checking
  const allProducts = await MyGlobal.prisma.e_commerce_mall_products.findMany({
    where,
    select: {
      id: true,
      base_price: true,
      created_at: true,
      variants: {
        select: {
          id: true,
          price: true,
          inventoryRecords: {
            select: {
              quantity_change: true,
            },
          },
        },
        where: { deleted_at: null },
      },
    },
  });
  // Compute effective price bounds, total stock, and created_at epoch per product.
  // Using number (epoch ms) instead of native Date for temporal comparisons.
  // IComputed is a purely internal type — id is plain string since it's only
  // used for lookup, never exposed externally.
  interface IComputed {
    id: string;
    createdAtEpoch: number;
    minPrice: number;
    maxPrice: number;
    totalStock: number;
  }
  const minPriceBound: number | undefined = props.body.minPrice;
  const maxPriceBound: number | undefined = props.body.maxPrice;
  const inStockOnly: boolean | undefined = props.body.inStockOnly;
  let computed: IComputed[] = allProducts.map((p) => {
    const variantPrices: number[] = p.variants.map((v) =>
      v.price !== null ? v.price : p.base_price,
    );
    const minEffectivePrice: number =
      variantPrices.length > 0 ? Math.min(...variantPrices) : p.base_price;
    const maxEffectivePrice: number =
      variantPrices.length > 0 ? Math.max(...variantPrices) : p.base_price;
    const totalStock: number = p.variants.reduce(
      (sum, v) =>
        sum + v.inventoryRecords.reduce((s, r) => s + r.quantity_change, 0),
      0,
    );
    return {
      id: p.id,
      createdAtEpoch: p.created_at.getTime(),
      minPrice: minEffectivePrice,
      maxPrice: maxEffectivePrice,
      totalStock,
    };
  });
  // Apply price range filter (in-memory)
  if (minPriceBound !== undefined) {
    computed = computed.filter((f) => f.minPrice >= minPriceBound);
  }
  if (maxPriceBound !== undefined) {
    computed = computed.filter((f) => f.maxPrice <= maxPriceBound);
  }
  // Apply in-stock-only filter (in-memory)
  if (inStockOnly === true) {
    computed = computed.filter((f) => f.totalStock > 0);
  }
  // Determine sort order and apply sorting
  const sort: string = props.body.sort ?? "newest";
  if (sort === "price_asc") {
    computed.sort((a, b) => a.minPrice - b.minPrice);
  } else if (sort === "price_desc") {
    computed.sort((a, b) => b.maxPrice - a.maxPrice);
  } else {
    // newest: sort by created_at epoch descending
    computed.sort((a, b) => b.createdAtEpoch - a.createdAtEpoch);
  }
  // Total count AFTER all filtering
  const total: number = computed.length;
  // Paginate: slice sorted/filtered IDs
  const paginatedIds: string[] = computed
    .slice(skip, skip + limit)
    .map((f) => f.id);
  // Phase 2: Re-fetch the page using transformer's select() for response
  const records = await MyGlobal.prisma.e_commerce_mall_products.findMany({
    where: { id: { in: paginatedIds } },
    ...ECommerceMallProductAtSummaryTransformer.select(),
  });
  // Re-order records to match sorted paginated order
  const recordMap: Map<string, (typeof records)[0]> = new Map(
    records.map((r) => [r.id, r]),
  );
  const orderedRecords: (typeof records)[0][] = paginatedIds.map((id) => {
    const record = recordMap.get(id);
    if (record === undefined) {
      throw new HttpException("Product data inconsistency", 500);
    }
    return record;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(orderedRecords, async (record) =>
      ECommerceMallProductAtSummaryTransformer.transform(record),
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerSearchProducts(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallProduct.IRequest;
// }): Promise<IPageIECommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_products.findMany({
//     ...ECommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------