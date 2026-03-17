import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistEntry";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistEntryAtSummaryTransformer } from "../transformers/ShoppingMallWishlistEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlistEntries(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistEntry.IRequest;
}): Promise<IPageIShoppingMallWishlistEntry.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search.length !== 0
        ? {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
  } satisfies Prisma.shopping_mall_wishlist_entriesWhereInput;
  const orderBy = (
    props.body.sort === "created_at_asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : [{ created_at: "desc" }, { id: "desc" }]
  ) satisfies Prisma.shopping_mall_wishlist_entriesOrderByWithRelationInput[];
  const rows = await MyGlobal.prisma.shopping_mall_wishlist_entries.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallWishlistEntryAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.shopping_mall_wishlist_entries.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallWishlistEntryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
