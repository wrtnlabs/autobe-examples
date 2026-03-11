import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.IRequest;
}): Promise<IPageIEcommerceMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_wishlist_itemsWhereInput = {
    customer_id: props.customer.id,
    product: {
      deleted_at: null,
      ...(props.body.search && {
        name: { contains: props.body.search, mode: "insensitive" },
      }),
      ...(props.body.category_id && {
        category_id: props.body.category_id,
      }),
      ...(props.body.is_available !== undefined && {
        is_available: props.body.is_available,
      }),
      ...(props.body.min_price !== undefined && {
        base_price: { gte: props.body.min_price },
      }),
      ...(props.body.max_price !== undefined && {
        base_price: { lte: props.body.max_price },
      }),
    },
  };
  const orderByInput = (() => {
    if (props.body.sort_field === "base_price") {
      return {
        product: {
          base_price: props.body.sort_order === "desc" ? "desc" : "asc",
        },
      } satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput;
    }
    return {
      created_at: props.body.sort_order === "desc" ? "desc" : "asc",
    } satisfies Prisma.ecommerce_mall_wishlist_itemsOrderByWithRelationInput;
  })();
  const data = await MyGlobal.prisma.ecommerce_mall_wishlist_items.findMany({
    where: where,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      created_at: true,
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          is_available: true,
          created_at: true,
          seller: {
            select: {
              id: true,
              shop_name: true,
              approval_status: true,
              is_suspended: true,
              created_at: true,
            },
          },
          images: {
            select: {
              id: true,
              image_url: true,
              sort_order: true,
              is_main: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
            orderBy: [{ is_main: "desc" }, { sort_order: "asc" }],
            take: 1,
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_wishlist_items.count({
    where: where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      created_at: item.created_at.toISOString(),
      product: {
        id: item.product.id as string & tags.Format<"uuid">,
        name: item.product.name,
        base_price: item.product.base_price,
        is_available: item.product.is_available,
        created_at: item.product.created_at.toISOString(),
        seller: {
          id: item.product.seller.id as string & tags.Format<"uuid">,
          shop_name: item.product.seller.shop_name,
          approval_status: item.product.seller.approval_status,
          is_suspended: item.product.seller.is_suspended,
          created_at: item.product.seller.created_at.toISOString(),
        },
        main_image: {
          id: item.product.images[0].id as string & tags.Format<"uuid">,
          image_url: item.product.images[0].image_url,
          sort_order: item.product.images[0].sort_order,
          is_main: item.product.images[0].is_main,
          created_at: item.product.images[0].created_at.toISOString(),
          updated_at: item.product.images[0].updated_at.toISOString(),
          deleted_at: item.product.images[0].deleted_at?.toISOString() ?? null,
        },
      },
    })),
  };
}
