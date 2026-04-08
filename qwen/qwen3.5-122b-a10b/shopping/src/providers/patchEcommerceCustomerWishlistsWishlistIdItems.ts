import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistItemAtSummaryTransformer } from "../transformers/EcommerceWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IEcommerceWishlistItem.IRequest;
}): Promise<IPageIEcommerceWishlistItem.ISummary> {
  // Validate wishlist ownership
  const wishlist = await MyGlobal.prisma.ecommerce_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  // Build where clause for wishlist items
  const where: Prisma.ecommerce_wishlist_itemsWhereInput = {
    ecommerce_wishlist_id: props.wishlistId,
    deleted_at: null,
    ecommerceProduct: {
      deleted_at: null,
    },
  };
  // Apply search filter (product name)
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search !== ""
  ) {
    where.ecommerceProduct = {
      deleted_at: null,
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    };
  }
  // Apply created_at range filters
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (
      props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
    ) {
      where.created_at.gte = new Date(props.body.created_at_from);
    }
    if (
      props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
    ) {
      where.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Cursor-based pagination
  let cursor: Prisma.ecommerce_wishlist_itemsWhereUniqueInput | undefined;
  if (
    props.body.cursor !== undefined &&
    props.body.cursor !== null &&
    props.body.cursor !== ""
  ) {
    try {
      const decoded = Buffer.from(props.body.cursor, "base64").toString(
        "utf-8",
      );
      const parts = decoded.split("|");
      if (parts.length === 2) {
        cursor = {
          created_at: new Date(parts[0]),
          id: parts[1],
        };
      }
    } catch {
      // Invalid cursor, ignore
    }
  }
  // Sorting
  const orderBy: Prisma.ecommerce_wishlist_itemsOrderByWithRelationInput[] = [];
  const sortField =
    props.body.sort_by !== undefined && props.body.sort_by !== null
      ? props.body.sort_by
      : "created_at";
  const sortOrder =
    props.body.sort_order !== undefined && props.body.sort_order !== null
      ? props.body.sort_order
      : "desc";
  if (sortField === "created_at") {
    orderBy.push({ created_at: sortOrder });
  } else if (sortField === "product_name") {
    orderBy.push({
      ecommerceProduct: {
        name: sortOrder,
      },
    });
  } else {
    orderBy.push({ created_at: "desc" });
  }
  // Limit (default 20, max 100)
  const limit: number =
    props.body.limit !== undefined && props.body.limit !== null
      ? Math.min(Math.max(props.body.limit, 1), 100)
      : 20;
  // Fetch records with cursor pagination
  const records = await MyGlobal.prisma.ecommerce_wishlist_items.findMany({
    where,
    cursor,
    take: limit + 1,
    orderBy,
    ...EcommerceWishlistItemAtSummaryTransformer.select(),
  });
  // Check if there's a next page
  const hasNextPage = records.length > limit;
  if (hasNextPage) {
    records.pop();
  }
  // Count total records
  const total: number = await MyGlobal.prisma.ecommerce_wishlist_items.count({
    where,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceWishlistItemAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const current: number = 1;
  const pages: number = total > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceWishlistItem.ISummary;
}
