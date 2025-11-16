import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerWishlistsWishlistIdWishlistItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: props.wishlistId,
      customer: { id: props.customer.id },
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    wishlist_id: props.wishlistId,
  } as {
    wishlist_id: string & tags.Format<"uuid">;
    product?: Prisma.shopping_mall_productsWhereInput | undefined;
  };

  if (props.body.search) {
    whereCondition.product = { name: { contains: props.body.search } };
  }

  const orderByCondition = {} as Record<string, "asc" | "desc">;
  if (props.body.sort_by && props.body.order) {
    orderByCondition[props.body.sort_by] = props.body.order;
  } else {
    orderByCondition["created_at"] = "desc";
  }

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      include: {
        product: true,
        wishlist: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: items.map((item) => {
      const product = item.product as {
        id: string & tags.Format<"uuid">;
        code: string;
        name: string;
        is_active: boolean;
        created_at: Date | (string & tags.Format<"date-time">);
        updated_at: Date | (string & tags.Format<"date-time">);
        deleted_at: Date | null | (string & tags.Format<"date-time">) | null;
      };
      const wishlist_ = item.wishlist as {
        id: string & tags.Format<"uuid">;
        name: string;
        shopping_mall_customer_id: string & tags.Format<"uuid">;
        created_at: Date | (string & tags.Format<"date-time">);
        deleted_at?: Date | null | (string & tags.Format<"date-time">) | null;
      };

      const quantity = (item as any).quantity ?? 0;

      const addedAt = item.created_at
        ? toISOStringSafe(
            item.created_at as Date | (string & tags.Format<"date-time">),
          )
        : "1970-01-01T00:00:00.000Z";

      return {
        id: item.id,
        product: {
          id: product.id,
          code: product.code,
          name: product.name,
          is_active: product.is_active,
          created_at: toISOStringSafe(product.created_at),
          updated_at: toISOStringSafe(product.updated_at),
          deleted_at: product.deleted_at
            ? toISOStringSafe(product.deleted_at)
            : null,
        },
        quantity: quantity satisfies number as number,
        added_at: addedAt satisfies string as string,
        wishlist: {
          id: wishlist_.id,
          name: wishlist_.name,
          customer: {
            id: wishlist_.shopping_mall_customer_id,
            email: "",
            name: "",
            status: "",
            created_at: "1970-01-01T00:00:00.000Z",
            updated_at: undefined,
          },
          created_at: toISOStringSafe(wishlist_.created_at),
          items_count: 0,
          is_public: false,
          description: undefined,
        },
      };
    }),
  };
}
