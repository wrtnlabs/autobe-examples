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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_wishlistsWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    active: true,
    deleted_at: null,
    ...(props.body.product_id && {
      ecommerce_mall_product_id: props.body.product_id,
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_wishlistsOrderByWithRelationInput =
    props.body.sort === "updated_at"
      ? { updated_at: props.body.order === "asc" ? "asc" : "desc" }
      : { created_at: props.body.order === "asc" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_wishlists.findMany({
    where: whereInput,
    skip,
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
      pages: Math.ceil(total / limit),
    },
  };
}
