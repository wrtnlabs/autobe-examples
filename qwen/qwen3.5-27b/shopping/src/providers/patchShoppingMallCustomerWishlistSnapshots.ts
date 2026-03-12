import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItemSnapshot";
import { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallWishlistItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlistSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallWishlistItemSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const whereInput = {
    wishlistItem: {
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    ...(props.body.shopping_mall_wishlist_item_id !== undefined && {
      shopping_mall_wishlist_item_id: props.body.shopping_mall_wishlist_item_id,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.shopping_mall_wishlist_item_snapshotsWhereInput;
  const orderByInput =
    sortBy === "id" ? { id: sortOrder } : { created_at: sortOrder };
  const data =
    await MyGlobal.prisma.shopping_mall_wishlist_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallWishlistItemSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_wishlist_item_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallWishlistItemSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
