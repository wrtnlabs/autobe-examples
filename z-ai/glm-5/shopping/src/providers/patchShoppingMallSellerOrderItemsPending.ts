import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
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

export async function patchShoppingMallSellerOrderItemsPending(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_seller_id: props.seller.id,
    ...(props.body.status !== undefined &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),
    ...(props.body.search !== undefined && {
      product_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.orderNumber !== undefined && {
      order: {
        order_number: {
          contains: props.body.orderNumber,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.createdFrom !== undefined && {
      created_at: { gte: props.body.createdFrom },
    }),
    ...(props.body.createdTo !== undefined && {
      created_at: { lte: props.body.createdTo },
    }),
    ...(props.body.productId !== undefined && {
      shopping_mall_product_id: props.body.productId,
    }),
  } satisfies Prisma.shopping_mall_order_itemsWhereInput;
  const sortValue = props.body.sort ?? "-created_at";
  const orderByInput = (() => {
    const isDescending = sortValue.startsWith("-");
    const field = isDescending ? sortValue.slice(1) : sortValue;
    const direction = isDescending ? ("desc" as const) : ("asc" as const);
    if (field === "created_at") {
      return {
        created_at: direction,
      } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
    }
    if (field === "status") {
      return {
        status: direction,
      } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
    }
    return {
      created_at: "desc" as const,
    } satisfies Prisma.shopping_mall_order_itemsOrderByWithRelationInput;
  })();
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
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
