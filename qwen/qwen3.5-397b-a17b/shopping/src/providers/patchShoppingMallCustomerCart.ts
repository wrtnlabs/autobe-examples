import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCart(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
    where: {
      shopping_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  const whereInput = {
    shopping_mall_cart_id: cart.id,
    ...(props.body.available !== undefined && {
      available: props.body.available,
    }),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "price,desc"
      ? { updated_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
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
      ShoppingMallCartItemAtSummaryTransformer.transform,
    ),
  };
}
