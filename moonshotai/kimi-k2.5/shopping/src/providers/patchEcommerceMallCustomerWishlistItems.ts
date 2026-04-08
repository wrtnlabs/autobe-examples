import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemAtSummaryTransformer } from "../transformers/EcommerceMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.IRequest;
}): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    ...(props.body.search && {
      product: {
        name: {
          contains: props.body.search,
        },
      },
    }),
    ...(props.body.category_id && {
      product: {
        category_id: props.body.category_id,
      },
    }),
    ...(props.body.seller_id && {
      product: {
        seller_id: props.body.seller_id,
      },
    }),
    ...(props.body.min_price !== undefined && {
      product: {
        base_price: {
          gte: props.body.min_price,
        },
      },
    }),
    ...(props.body.max_price !== undefined && {
      product: {
        base_price: {
          lte: props.body.max_price,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_wishlist_itemsWhereInput;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder =
    props.body.sort_order ?? (sortBy === "created_at" ? "desc" : "asc");
  const orderByInput = (
    sortBy === "created_at"
      ? { created_at: sortOrder }
      : sortBy === "name"
        ? { product: { name: sortOrder } }
        : { product: { base_price: sortOrder } }
  ) satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput;
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereInput,
  });
  const items = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      items,
      EcommerceMallWishlistItemAtSummaryTransformer.transform,
    ),
  };
}
