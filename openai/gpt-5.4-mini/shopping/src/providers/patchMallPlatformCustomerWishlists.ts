import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformCustomerAtSummaryTransformer } from "../transformers/MallPlatformCustomerAtSummaryTransformer";
import { MallPlatformWishlistAtSummaryTransformer } from "../transformers/MallPlatformWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlist.IRequest;
}): Promise<IPageIMallPlatformWishlist.ISummary> {
  const current: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const offset: number = (current - 1) * limit;
  const wishlist = await MyGlobal.prisma.mall_platform_wishlists.findUnique({
    where: {
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      customer: MallPlatformCustomerAtSummaryTransformer.select(),
      wishlistItems: {
        select: {
          id: true,
        },
      },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (wishlist === null) {
    return {
      data: [],
      pagination: {
        current,
        limit,
        records: 0,
        pages: 0,
      },
    };
  }
  const records = 1;
  return {
    data:
      offset === 0
        ? [await MallPlatformWishlistAtSummaryTransformer.transform(wishlist)]
        : [],
    pagination: {
      current,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
