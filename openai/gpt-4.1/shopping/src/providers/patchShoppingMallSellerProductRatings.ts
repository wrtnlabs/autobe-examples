import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import { IPageIShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductRating";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerProductRatings(props: {
  seller: SellerPayload;
  body: IShoppingMallProductRating.IRequest;
}): Promise<IPageIShoppingMallProductRating.ISummary> {
  const {
    shopping_mall_product_rating_id,
    shopping_mall_customer_id,
    shopping_mall_customer_session_id,
    shopping_mall_product_id,
    shopping_mall_product_sku_id,
    shopping_mall_order_id,
    shopping_mall_order_item_id,
    value,
    created_at,
    updated_at,
    deleted_at,
    page = 1,
    limit = 100,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;
  const skip = (page - 1) * limit;
  // Get set of this seller's product ids
  const productRows = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: {
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const productIdSet = new Set(productRows.map((p) => p.id));
  if (productIdSet.size === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 1,
      },
    };
  }
  // Get SKUs for the seller's products
  const skuRows = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
    where: {
      shopping_mall_product_id: { in: Array.from(productIdSet) },
      deleted_at: null,
    },
    select: { id: true },
  });
  const skuIdSet = new Set(skuRows.map((s) => s.id));
  if (skuIdSet.size === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 1,
      },
    };
  }
  // Build Prisma where condition
  const where: Record<string, any> = {
    id: shopping_mall_product_rating_id,
    shopping_mall_customer_id,
    shopping_mall_customer_session_id,
    shopping_mall_product_id: shopping_mall_product_id
      ? shopping_mall_product_id
      : undefined,
    shopping_mall_product_sku_id: shopping_mall_product_sku_id
      ? shopping_mall_product_sku_id
      : { in: Array.from(skuIdSet) },
    shopping_mall_order_id,
    shopping_mall_order_item_id,
    value,
    created_at: created_at ? new Date(created_at) : undefined,
    updated_at: updated_at ? new Date(updated_at) : undefined,
    deleted_at: deleted_at === undefined ? null : deleted_at,
  };
  Object.keys(where).forEach((key) => {
    if (where[key] === undefined) delete where[key];
  });
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_ratings.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: sort_order },
    }),
    MyGlobal.prisma.shopping_mall_product_ratings.count({ where }),
  ]);
  if (rows.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
  const customerIds = Array.from(
    new Set(rows.map((r) => r.shopping_mall_customer_id)),
  );
  const prodIds = Array.from(
    new Set(rows.map((r) => r.shopping_mall_product_id)),
  );
  const skuIds = Array.from(
    new Set(rows.map((r) => r.shopping_mall_product_sku_id)),
  );
  // Batch fetch references
  const [customers, products, skus] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    }),
    MyGlobal.prisma.shopping_mall_products.findMany({
      where: { id: { in: prodIds } },
      select: {
        id: true,
        title: true,
        default_price: true,
        business_status: true,
        shopping_mall_seller_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_skus.findMany({
      where: { id: { in: skuIds } },
      select: {
        id: true,
        sku_code: true,
        shopping_mall_product_id: true,
        stock: true,
      },
    }),
  ]);
  const customerMap: Record<string, { id: string; name: string }> = {};
  customers.forEach((c) => {
    customerMap[c.id] = c;
  });
  const productMap: Record<string, (typeof products)[0]> = {};
  products.forEach((p) => {
    productMap[p.id] = p;
  });
  const skuMap: Record<string, (typeof skus)[0]> = {};
  skus.forEach((s) => {
    skuMap[s.id] = s;
  });
  const sellerSummary = {
    id: props.seller.id,
    business_name: "", // No business_name field in schema, fallback to empty string
  };
  const data = rows.map((r) => {
    const prod = productMap[r.shopping_mall_product_id];
    const sku = skuMap[r.shopping_mall_product_sku_id];
    const customer = customerMap[r.shopping_mall_customer_id];
    return {
      id: r.id,
      value: r.value,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at:
        r.deleted_at === null ? undefined : toISOStringSafe(r.deleted_at),
      customer: customer
        ? { id: customer.id, name: customer.name }
        : { id: r.shopping_mall_customer_id, name: "" },
      product: prod
        ? {
            id: prod.id,
            title: prod.title,
            default_price: prod.default_price,
            business_status: prod.business_status,
            seller: sellerSummary,
            categories: [],
            created_at: toISOStringSafe(prod.created_at),
          }
        : {
            id: r.shopping_mall_product_id,
            title: "",
            default_price: 0,
            business_status: "",
            seller: sellerSummary,
            categories: [],
            created_at: toISOStringSafe(new Date()),
          },
      productSku: sku
        ? {
            id: sku.id,
            code: sku.sku_code,
            product_title: prod ? prod.title : "",
            option_summary: "",
            in_stock: sku.stock > 0,
          }
        : {
            id: r.shopping_mall_product_sku_id,
            code: "",
            product_title: prod ? prod.title : "",
            option_summary: "",
            in_stock: false,
          },
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
