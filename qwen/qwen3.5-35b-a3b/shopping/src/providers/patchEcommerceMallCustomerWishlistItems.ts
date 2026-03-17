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
  const productFilter: Prisma.ecommerce_mall_productsWhereInput = {
    deleted_at: null,
    status: "active",
  };
  if (props.body.search) {
    productFilter.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.category_id) {
    productFilter.category_id = props.body.category_id;
  }
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    if (
      props.body.min_price !== undefined &&
      props.body.max_price !== undefined
    ) {
      productFilter.variants = {
        some: {
          AND: [
            { base_price: { gte: props.body.min_price } },
            { base_price: { lte: props.body.max_price } },
          ],
        },
      };
    } else if (props.body.min_price !== undefined) {
      productFilter.variants = {
        some: {
          base_price: { gte: props.body.min_price },
        },
      };
    } else if (props.body.max_price !== undefined) {
      productFilter.variants = {
        some: {
          base_price: { lte: props.body.max_price },
        },
      };
    }
  }
  const whereInput: Prisma.ecommerce_mall_wishlist_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    product: productFilter,
  };
  const orderByInput = (() => {
    if (
      props.body.sort &&
      props.body.direction &&
      (props.body.sort === "created_at" ||
        props.body.sort === "name" ||
        props.body.sort === "base_price")
    ) {
      switch (props.body.sort) {
        case "created_at":
          return {
            created_at: props.body.direction === "asc" ? "asc" : "desc",
          };
        case "name":
          return {
            product: {
              name: props.body.direction === "asc" ? "asc" : "desc",
            },
          };
        case "base_price":
          return {
            product: {
              base_price: props.body.direction === "asc" ? "asc" : "desc",
            },
          };
        default:
          return { created_at: "desc" };
      }
    }
    return { created_at: "desc" };
  })() satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput;
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: whereInput,
  });
  const items = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistItemAtSummaryTransformer.select(),
  });
  const data = await ArrayUtil.asyncMap(
    items,
    EcommerceMallWishlistItemAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
