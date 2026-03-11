import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistAtSummaryTransformer } from "../transformers/EcommerceMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.IRequest;
}): Promise<IPageIEcommerceMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build select input from transformer for product info with variants
  const selectInput = EcommerceMallWishlistAtSummaryTransformer.select();
  // Build orderBy based on sort parameter
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  // Construct orderBy input with proper typing
  const orderByInput = (
    sortField === "created_at"
      ? {
          created_at: sortDirection,
        }
      : sortField === "product_name"
        ? {
            product: {
              name: sortDirection,
            },
          }
        : sortField === "price"
          ? {
              product: {
                base_price: sortDirection,
              },
            }
          : {
              created_at: sortDirection,
            }
  ) satisfies Prisma.ecommerce_mall_wishlistsOrderByWithRelationInput;
  // Get paginated wishlist entries with product information
  const data = await MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
    ...selectInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_wishlists.count({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
  // Transform each wishlist entry
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallWishlistAtSummaryTransformer.transform,
  );
  // Apply stock status filter if specified (after transformation)
  let finalData = transformedData;
  if (props.body.stockStatus && props.body.stockStatus !== "all") {
    finalData = transformedData.filter((item) => {
      if (props.body.stockStatus === "in-stock") {
        return item.product.stockStatus === "in-stock";
      }
      if (props.body.stockStatus === "out-of-stock") {
        return item.product.stockStatus === "out-of-stock";
      }
      return true;
    });
  }
  return {
    data: finalData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallWishlist.ISummary;
}
