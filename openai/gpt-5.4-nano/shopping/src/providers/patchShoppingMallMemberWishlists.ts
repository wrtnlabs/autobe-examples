import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistAtSummaryTransformer } from "../transformers/ShoppingMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberWishlists(props: {
  member: MemberPayload;
  body: IShoppingMallWishlist.IRequest;
}): Promise<IPageIShoppingMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Invalid page", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_member_id: props.member.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_wishlistsWhereInput;
  const records = await MyGlobal.prisma.shopping_mall_wishlists.count({
    where,
  });
  const data = await MyGlobal.prisma.shopping_mall_wishlists.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...ShoppingMallWishlistAtSummaryTransformer.select(),
  });
  return {
    data: await ArrayUtil.asyncMap(data, (at) =>
      ShoppingMallWishlistAtSummaryTransformer.transform(at),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
