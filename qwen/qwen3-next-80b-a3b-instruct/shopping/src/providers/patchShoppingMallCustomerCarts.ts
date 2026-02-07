import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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

export async function patchShoppingMallCustomerCarts(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const limit = 100; // Fixed default to match ISummary expectations
  const whereClause = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereClause,
    orderBy: { id: "asc" },
    take: limit + 1,
    select: {
      id: true,
      quantity: true,
      snapshot_product_name: true,
      snapshot_seller_shop_name: true,
      snapshot_variant_options: true,
      snapshot_variant_price: true,
      created_at: true,
    },
  });
  const hasNextPage = data.length > limit;
  const lastItem = hasNextPage ? data.pop() : null;
  const records = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: whereClause,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      snapshot_product_name: item.snapshot_product_name,
      snapshot_seller_shop_name: item.snapshot_seller_shop_name,
      snapshot_variant_options: item.snapshot_variant_options,
      snapshot_variant_price: item.snapshot_variant_price,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: 1,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
