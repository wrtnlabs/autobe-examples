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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCartAtSummaryTransformer } from "../transformers/ShoppingMallCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCarts(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IPageIShoppingMallCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const hasItemsCountFilter =
    props.body.items_count_from !== undefined ||
    props.body.items_count_to !== undefined;
  // Build base WHERE clause for cart-level filters
  const whereInput = {
    deleted_at:
      props.body.deleted_at === undefined
        ? null
        : props.body.deleted_at === null
          ? null
          : new Date(props.body.deleted_at),
    ...(props.body.customer_id && { customer_id: props.body.customer_id }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_cartsWhereInput;
  if (hasItemsCountFilter) {
    // When items_count filter is present, fetch all matching carts and filter in-memory
    const allCarts = await MyGlobal.prisma.shopping_mall_carts.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCartAtSummaryTransformer.select(),
    });
    // Filter by items_count range
    const filteredCarts = allCarts.filter((cart) => {
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
    // Apply pagination after filtering
    const paginatedCarts = filteredCarts.slice(skip, skip + limit);
    const total = filteredCarts.length;
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        paginatedCarts,
        ShoppingMallCartAtSummaryTransformer.transform,
      ),
    } satisfies IPageIShoppingMallCart.ISummary;
  } else {
    // No items_count filter - use standard pagination
    const [carts, total] = await Promise.all([
      MyGlobal.prisma.shopping_mall_carts.findMany({
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...ShoppingMallCartAtSummaryTransformer.select(),
      }),
      MyGlobal.prisma.shopping_mall_carts.count({ where: whereInput }),
    ]);
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        carts,
        ShoppingMallCartAtSummaryTransformer.transform,
      ),
    } satisfies IPageIShoppingMallCart.ISummary;
  }
}
