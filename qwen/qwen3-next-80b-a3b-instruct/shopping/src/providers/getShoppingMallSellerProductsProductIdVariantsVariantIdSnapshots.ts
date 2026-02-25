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

export async function getShoppingMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  page?: number;
  limit?: number;
}): Promise<IPageIShoppingMallProductVariantSnapshot> {
  // 1. Find the variant to verify existence and identity
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        product_id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 2. Authorization check: Fetch the product to get seller_id
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.product_id },
      select: { seller_id: true },
    });
  if (props.seller.type === "seller") {
    // Seller has full access to their own products
  } else if (props.seller.id === product.seller_id) {
    // Seller owns the product variant
  } else {
    // Customer: check if they've purchased this variant
    const customerOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
      where: {
        customer_id: props.seller.id,
      },
      select: { id: true },
    });
    const orderIds = customerOrders.map((order) => order.id);
    if (orderIds.length === 0) {
      throw new HttpException("Forbidden", 403);
    }
    const purchasedItem =
      await MyGlobal.prisma.shopping_mall_order_items.findFirst({
        where: {
          shopping_mall_product_variant_id: props.variantId,
          shopping_mall_order_id: { in: orderIds },
        },
      });
    if (!purchasedItem) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Pagination parameters (default: page=1, limit=100)
  const page = props.page ?? 1;
  const limit = props.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Query snapshots with order by version ASC
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: {
        product_variant_id: props.variantId,
      },
      orderBy: {
        version: "asc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        product_variant_id: true,
        changed_by: true,
        version: true,
        sku_code: true,
        price: true,
        previous_sku_code: true,
        previous_price: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  // 5. Count total snapshots
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: {
        product_variant_id: props.variantId,
      },
    });
  // 6. Transform to IPageIShoppingMallProductVariantSnapshot
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      product_variant_id: snapshot.product_variant_id,
      changed_by: snapshot.changed_by,
      version: snapshot.version,
      sku_code: snapshot.sku_code,
      price: snapshot.price,
      previous_sku_code: snapshot.previous_sku_code,
      previous_price: snapshot.previous_price,
      changed_at: toISOStringSafe(snapshot.changed_at),
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIShoppingMallProductVariantSnapshot;
}
