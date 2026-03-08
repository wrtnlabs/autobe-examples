import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistAtSummaryTransformer } from "../transformers/EcommerceMallWishlistAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlist.IRequest;
}): Promise<IPageIEcommerceMallWishlist.ISummary> {
  const page = props.body.page ?? 1;
  const limit = (props.body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_wishlistsWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.availability === "in-stock"
      ? { product: { stockQuantity: { gt: 0 } } }
      : props.body.availability === "out-of-stock"
        ? { product: { stockQuantity: { equals: 0 } } }
        : {}),
    product: { is_active: true },
  } satisfies Prisma.ecommerce_mall_wishlistsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_wishlistsOrderByWithRelationInput[] =
    props.body.sortBy === "price"
      ? props.body.sortOrder === "asc"
        ? [{ product: { base_price: "asc" }, created_at: "asc" }]
        : [{ product: { base_price: "desc" }, created_at: "desc" }]
      : props.body.sortOrder === "asc"
        ? [{ created_at: "asc" }]
        : [{ created_at: "desc" }];
  const cursor = props.body.cursor;
  const cursorInput: Prisma.ecommerce_mall_wishlistsWhereInput =
    cursor !== undefined && cursor !== null
      ? { created_at: { lt: cursor } }
      : {};
  const data = await MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
    where: {
      ...whereInput,
      ...cursorInput,
    },
    skip: skip > 0 ? skip : undefined,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallWishlistAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_wishlists.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallWishlistAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
