import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerWishlistAtSummaryTransformer } from "../transformers/ShoppingMallCustomerWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerWishlist.IRequest;
}): Promise<IPageIShoppingMallCustomerWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.shopping_mall_customer_wishlists.findMany({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
    skip,
    take: limit,
    orderBy: { added_at: "desc" },
    ...ShoppingMallCustomerWishlistAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_wishlists.count({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerWishlistAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
