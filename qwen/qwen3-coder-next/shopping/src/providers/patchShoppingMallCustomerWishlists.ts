import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IPageIShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.pagination.current ?? 1;
  const limit = props.body.pagination.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      product: {
        include: {
          seller: true,
          category: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      created_at: toISOStringSafe(item.created_at),
      product: {
        id: item.product.id,
        name: item.product.name,
        base_price: Number(item.product.base_price),
        is_deleted: item.product.is_deleted,
        seller: {
          id: item.product.seller.id,
          shop_name: item.product.seller.shop_name,
          approval_status: item.product.seller.approval_status,
          created_at: toISOStringSafe(item.product.seller.created_at),
        },
        category: {
          id: item.product.category.id,
          name: item.product.category.name,
          description: item.product.category.description,
          parent: null,
          subcategory_count: 0,
        },
        average_rating: 0,
      },
      seller: {
        id: item.product.seller.id,
        shop_name: item.product.seller.shop_name,
        approval_status: item.product.seller.approval_status,
        created_at: toISOStringSafe(item.product.seller.created_at),
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
