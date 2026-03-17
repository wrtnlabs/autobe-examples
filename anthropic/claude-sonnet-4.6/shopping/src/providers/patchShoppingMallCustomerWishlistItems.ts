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
import { ShoppingMallWishlistItemAtSummaryTransformer } from "../transformers/ShoppingMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    product: {
      deleted_at: null,
      ...(props.body.search != null && props.body.search.length > 0
        ? {
            name: { contains: props.body.search, mode: "insensitive" as const },
          }
        : {}),
    },
  } satisfies Prisma.shopping_mall_wishlist_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "name"
      ? { product: { name: "asc" as const } }
      : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallWishlistItemAtSummaryTransformer.transform,
    ),
  };
}
