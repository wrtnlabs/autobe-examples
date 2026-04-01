import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallOrderItemAtSummaryTransformer } from "../transformers/ShoppingMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrdersItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    deleted_at: null,
    shopping_mall_seller_id: props.seller.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.orderId && { shopping_mall_order_id: props.body.orderId }),
    ...(props.body.productId && {
      product_snapshot: {
        contains: `"id":"${props.body.productId}"`,
      },
    }),
    ...(props.body.variantId && {
      variant_snapshot: {
        contains: `"id":"${props.body.variantId}"`,
      },
    }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.priceMin !== undefined && {
      price: {
        gte: props.body.priceMin,
      },
    }),
    ...(props.body.priceMax !== undefined && {
      price: {
        lte: props.body.priceMax,
      },
    }),
    ...(props.body.quantityMin !== undefined && {
      quantity: {
        gte: props.body.quantityMin,
      },
    }),
    ...(props.body.quantityMax !== undefined && {
      quantity: {
        lte: props.body.quantityMax,
      },
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    props.body.sortBy && props.body.sortOrder
      ? { [props.body.sortBy]: props.body.sortOrder }
      : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
