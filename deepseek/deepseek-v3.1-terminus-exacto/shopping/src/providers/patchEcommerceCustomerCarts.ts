import { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceShoppingCartAtSummaryTransformer } from "../transformers/EcommerceShoppingCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceShoppingCart.IRequest;
}): Promise<IPageIEcommerceShoppingCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE clause with all filters
  const whereInput = {
    deleted_at: null,
    customer: {
      deleted_at: null,
      ...(props.body.customer_id && { id: props.body.customer_id }),
      ...(props.body.customer_email && {
        email: { contains: props.body.customer_email, mode: "insensitive" },
      }),
      ...(props.body.customer_display_name && {
        display_name: {
          contains: props.body.customer_display_name,
          mode: "insensitive",
        },
      }),
    },
    ...(props.body.created_at_start && {
      created_at: { gte: new Date(props.body.created_at_start) },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: new Date(props.body.created_at_end) },
    }),
    ...(props.body.updated_at_start && {
      updated_at: { gte: new Date(props.body.updated_at_start) },
    }),
    ...(props.body.updated_at_end && {
      updated_at: { lte: new Date(props.body.updated_at_end) },
    }),
  } satisfies Prisma.ecommerce_shopping_cartsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_shopping_carts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceShoppingCartAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_shopping_carts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceShoppingCartAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
