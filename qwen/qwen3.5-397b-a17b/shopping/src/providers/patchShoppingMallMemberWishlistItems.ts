import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistItemAtSummaryTransformer } from "../transformers/ShoppingMallWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberWishlistItems(props: {
  member: MemberPayload;
  body: IShoppingMallWishlistItem.IRequest;
}): Promise<IPageIShoppingMallWishlistItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_member_id: props.member.id,
    deleted_at: null,
    product: {
      deleted_at: null,
    },
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        product: {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
  } satisfies Prisma.shopping_mall_wishlist_itemsWhereInput;
  const orderByInput = (() => {
    if (props.body.sort === undefined) {
      return { created_at: "desc" };
    }
    const direction = props.body.sort.startsWith("-") ? "desc" : "asc";
    const field = props.body.sort.replace(/^[+-]/, "");
    if (field === "created_at") {
      return { created_at: direction };
    }
    if (field === "name") {
      return {
        product: {
          name: direction,
        },
      };
    }
    return { created_at: "desc" };
  })() satisfies Prisma.shopping_mall_wishlist_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_wishlist_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallWishlistItemAtSummaryTransformer.transform,
    ),
  };
}
