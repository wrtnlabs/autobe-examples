import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  // 1. Authorization: check that the wishlist belongs to the authenticated customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: { id: props.wishlistId },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get customer summary
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: wishlist.shopping_mall_customer_id },
    select: { id: true, name: true },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  // 3. Pagination
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit = Math.max(1, Math.min(props.body.limit, 100));
  const skip = (page - 1) * limit;
  // 4. Search & filter conditions
  let skuFilterIds: string[] | undefined = undefined;
  const search = props.body.search?.trim();
  if (search) {
    const foundSkus = await MyGlobal.prisma.shopping_mall_product_skus.findMany(
      {
        where: {
          OR: [{ sku_code: { contains: search, mode: "insensitive" } }],
        },
        select: { id: true },
      },
    );
    skuFilterIds = foundSkus.map((s) => s.id);
  }
  // 5. Build WHERE
  const where: any = { shopping_mall_wishlist_id: props.wishlistId };
  if (skuFilterIds) {
    where.shopping_mall_product_sku_id = { in: skuFilterIds };
  }
  // 6. Sorting (only created_at is available)
  let orderBy: any = { created_at: props.body.order ?? "desc" };
  // 7. Query paged items and total count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({ where }),
  ]);
  // 8. Batch fetch all SKUs for wishlist items
  const skuIds = items.map((item) => item.shopping_mall_product_sku_id);
  const skuRows = skuIds.length
    ? await MyGlobal.prisma.shopping_mall_product_skus.findMany({
        where: { id: { in: skuIds } },
        select: {
          id: true,
          sku_code: true,
          shopping_mall_product_id: true,
          stock: true,
        },
      })
    : [];
  const skuMap = new Map(skuRows.map((sku) => [sku.id, sku]));
  // 9. Fetch all products for the SKUs
  const uniqueProductIds = [
    ...new Set(skuRows.map((sku) => sku.shopping_mall_product_id)),
  ];
  const productRows = uniqueProductIds.length
    ? await MyGlobal.prisma.shopping_mall_products.findMany({
        where: { id: { in: uniqueProductIds } },
        select: { id: true, title: true },
      })
    : [];
  const productMap = new Map(productRows.map((prod) => [prod.id, prod]));
  // 10. Compute wishlist summary
  const wishlistSummary = {
    id: wishlist.id,
    customer: { id: customer.id, name: customer.name },
    created_at: toISOStringSafe(wishlist.created_at),
  };
  // 11. Map to DTO
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => {
      const sku = skuMap.get(item.shopping_mall_product_sku_id);
      const product = sku
        ? productMap.get(sku.shopping_mall_product_id)
        : undefined;
      return {
        id: item.id,
        wishlist: wishlistSummary,
        sku: sku
          ? {
              id: sku.id,
              code: sku.sku_code,
              product_title: product?.title ?? "",
              option_summary: "",
              in_stock: typeof sku.stock === "number" ? sku.stock > 0 : false,
            }
          : {
              id: item.shopping_mall_product_sku_id,
              code: "",
              product_title: "",
              option_summary: "",
              in_stock: false,
            },
        created_at: toISOStringSafe(item.created_at),
      };
    }),
  };
}
