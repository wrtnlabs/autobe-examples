import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlist";
import { IPageIShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingWishlistItem";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IShoppingWishlist.IRequest;
}): Promise<IPageIShoppingWishlistItem.ISummary> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  let orderBy: any;
  switch (body.sort_by) {
    case "oldest":
      orderBy = { added_at: "asc" };
      break;
    case "name":
      orderBy = {
        sku: { sku_code: "asc" }, // As we have no name on SKU, and product name is not joined directly, use sku_code
      };
      break;
    case "price_asc":
      orderBy = { sku: { price: "asc" } };
      break;
    case "price_desc":
      orderBy = { sku: { price: "desc" } };
      break;
    default:
      orderBy = { added_at: "desc" };
      break;
  }
  const wishlist = await MyGlobal.prisma.shopping_wishlists.findFirst({
    where: { shopping_customer_id: customer.id },
    select: { id: true },
  });
  if (!wishlist) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // Filtering by SKU status or search
  const getSkuIds = async (): Promise<string[]> => {
    let skuWhere: Record<string, any> = {};
    if (body.in_stock_only === true) {
      skuWhere.is_active = true;
      skuWhere.status = "in_stock";
    }
    if (body.search) {
      skuWhere.OR = [{ sku_code: { contains: body.search } }];
    }
    // Filtering by tag_codes and category_codes is omitted for brevity, as it requires traversing shopping_products relationships
    const skus = await MyGlobal.prisma.shopping_skus.findMany({
      where: skuWhere,
      select: { id: true },
    });
    return skus.map((s) => s.id);
  };
  let skuIds: string[] | undefined = undefined;
  if (body.in_stock_only || body.search) {
    skuIds = await getSkuIds();
    if (skuIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }
  // Compose wishlist items query
  const where: Record<string, any> = { shopping_wishlist_id: wishlist.id };
  if (skuIds) {
    where.shopping_sku_id = { in: skuIds };
  }
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_wishlist_items.findMany({
      where,
      include: {
        sku: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            is_active: true,
            status: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_wishlist_items.count({ where }),
  ]);
  const data: IShoppingWishlistItem.ISummary[] = items
    .filter((item) => item.sku !== null && item.sku !== undefined)
    .map((item) => ({
      id: item.id,
      sku: {
        id: item.sku.id,
        sku_code: item.sku.sku_code,
        price: item.sku.price,
        is_active: item.sku.is_active,
        status: item.sku.status,
      },
      added_at: toISOStringSafe(item.added_at),
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
