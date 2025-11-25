import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  // Validate that the wishlist exists and belongs to the customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found or access denied", 404);
  }

  // Build search condition
  let whereCondition: Prisma.shopping_mall_wishlist_itemsWhereInput = {
    shopping_mall_wishlist_id: props.wishlistId,
    deleted_at: null,
  };

  if (props.body.search) {
    whereCondition.OR = [
      {
        productVariant: {
          title: { contains: props.body.search, mode: "insensitive" },
        },
      },
      {
        productVariant: {
          product: {
            description: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        },
      },
      { note: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Build sort condition
  const sortBy = props.body.sortBy || "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";

  // Define order object based on allowed sortBy values
  const orderBy: Record<string, "asc" | "desc"> = {
    [sortBy === "productName"
      ? "productVariant_title"
      : sortBy === "price"
        ? "productVariant_price"
        : sortBy === "noteLength"
          ? "note_length"
          : "created_at"]: sortOrder,
  };

  // Define pagination
  const page = props.body.page || 1;
  const limit = props.body.limit || 10;
  const skip = (page - 1) * limit;

  // Fetch data with counts
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: whereCondition,
    }),
  ]);

  // Map to empty IShoppingMallWishlistItem.ISummary objects — as per schema definition
  const mappedData = data.map((item) => ({
    // ISummary is {} — so return empty object exactly
    // NO additional fields allowed — even if the description suggests otherwise
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
