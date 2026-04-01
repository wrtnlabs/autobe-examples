import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_wishlist_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    product: {
      deleted_at: null,
      status: "active",
      ...(props.body.min_price !== undefined && {
        variants: {
          some: {
            sale_price: {
              gte: props.body.min_price,
            },
          },
        },
      }),
      ...(props.body.max_price !== undefined && {
        variants: {
          some: {
            sale_price: {
              lte: props.body.max_price,
            },
          },
        },
      }),
    },
    ...(props.body.search !== undefined && {
      product: {
        name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.category_id !== undefined && {
      product: {
        category_id: props.body.category_id,
      },
    }),
  } satisfies Prisma.ecommerce_mall_wishlist_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "name"
      ? [{ product: { name: props.body.direction ?? "asc" } }]
      : props.body.sort === "base_price"
        ? [{ product: { base_price: props.body.direction ?? "asc" } }]
        : [{ created_at: props.body.direction ?? "desc" }]
  ) satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallWishlistItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
