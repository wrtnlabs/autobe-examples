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

export async function patchEcommerceCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceWishlistItem.IRequest;
}): Promise<IPageIEcommerceWishlistItem.ISummary> {
  const wishlist = await MyGlobal.prisma.ecommerce_wishlists.findFirst({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  let cursorCreatedAt: (string & tags.Format<"date-time">) | undefined;
  let cursorId: (string & tags.Format<"uuid">) | undefined;
  if (props.body.cursor) {
    try {
      const decoded: string = Buffer.from(props.body.cursor, "base64").toString(
        "utf-8",
      );
      const parts: string[] = decoded.split("|");
      if (parts.length === 2) {
        cursorCreatedAt = typia.createAssert<
          string & tags.Format<"date-time">
        >()(parts[0]);
        cursorId = typia.createAssert<string & tags.Format<"uuid">>()(parts[1]);
      }
    } catch {
      cursorCreatedAt = undefined;
      cursorId = undefined;
    }
  }
  const limit: number = props.body.limit
    ? typia.createAssert<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >()(props.body.limit)
    : 20;
  const page: number = props.body.page
    ? typia.createAssert<number & tags.Type<"int32"> & tags.Minimum<0>>()(
        props.body.page,
      )
    : 1;
  const whereInput: Prisma.ecommerce_wishlist_itemsWhereInput = {
    ecommerce_wishlist_id: wishlist.id,
    deleted_at: null,
    ...(props.body.search || props.body.availability_status
      ? {
          ecommerceProduct: {
            ...(props.body.search
              ? {
                  name: {
                    contains: props.body.search,
                    mode: "insensitive",
                  },
                }
              : {}),
            ...(props.body.availability_status
              ? {
                  stock_status: props.body.availability_status,
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.created_at_from
      ? {
          created_at: {
            gte: props.body.created_at_from,
          },
        }
      : {}),
    ...(props.body.created_at_to
      ? {
          created_at: {
            lte: props.body.created_at_to,
          },
        }
      : {}),
    ...(cursorCreatedAt && cursorId
      ? {
          AND: [
            {
              OR: [
                {
                  created_at: {
                    lt: cursorCreatedAt,
                  },
                },
                {
                  AND: [
                    { created_at: cursorCreatedAt },
                    { id: { lt: cursorId } },
                  ],
                },
              ],
            },
          ],
        }
      : {}),
  } satisfies Prisma.ecommerce_wishlist_itemsWhereInput;
  const orderByInput: Prisma.ecommerce_wishlist_itemsOrderByWithRelationInput =
    props.body.sort_by && props.body.sort_order
      ? typia.createAssert<Prisma.ecommerce_wishlist_itemsOrderByWithRelationInput>()(
          Object.fromEntries([[props.body.sort_by, props.body.sort_order]]),
        )
      : { created_at: "desc" };
  const records = await MyGlobal.prisma.ecommerce_wishlist_items.findMany({
    where: whereInput,
    orderBy: orderByInput,
    take: limit,
    ...EcommerceWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_wishlist_items.count({
    where: whereInput,
  });
  const pages: number = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceWishlistItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceWishlistItem.ISummary;
}
