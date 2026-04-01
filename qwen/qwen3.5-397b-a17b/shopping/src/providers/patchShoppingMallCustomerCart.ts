import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartAtSummaryTransformer } from "../transformers/ShoppingMallCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput: Prisma.shopping_mall_cartsWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.deleted_at === null
      ? { deleted_at: null }
      : props.body.deleted_at !== undefined
        ? { deleted_at: { equals: new Date(props.body.deleted_at) } }
        : { deleted_at: null }),
  };
  const allCarts = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    ...ShoppingMallCartAtSummaryTransformer.select(),
  });
  let filteredCarts = allCarts;
  if (
    props.body.items_count_from !== undefined ||
    props.body.items_count_to !== undefined
  ) {
    filteredCarts = allCarts.filter((cart) => {
      const itemCount = cart.items.length;
      if (
        props.body.items_count_from !== undefined &&
        itemCount < props.body.items_count_from
      ) {
        return false;
      }
      if (
        props.body.items_count_to !== undefined &&
        itemCount > props.body.items_count_to
      ) {
        return false;
      }
      return true;
    });
  }
  const total = filteredCarts.length;
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const paginatedCarts = filteredCarts.slice(skip, skip + limit);
  return {
    data: await ArrayUtil.asyncMap(
      paginatedCarts,
      ShoppingMallCartAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
