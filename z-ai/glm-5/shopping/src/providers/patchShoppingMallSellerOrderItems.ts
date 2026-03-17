import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function patchShoppingMallSellerOrderItems(props: {
  seller: SellerPayload;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.shopping_mall_order_itemsWhereInput = {
    shopping_mall_seller_id: props.seller.id,
    deleted_at: null,
    ...(props.body.shopping_mall_order_id !== undefined && {
      shopping_mall_order_id: props.body.shopping_mall_order_id,
    }),
    ...(props.body.shopping_mall_product_id !== undefined && {
      shopping_mall_product_id: props.body.shopping_mall_product_id,
    }),
    ...(props.body.shopping_mall_product_variant_id !== undefined && {
      shopping_mall_product_variant_id:
        props.body.shopping_mall_product_variant_id,
    }),
    ...(props.body.shopping_mall_shipment_id !== undefined && {
      shopping_mall_shipment_id: props.body.shopping_mall_shipment_id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
        ...(props.body.created_at_to !== undefined && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_from === undefined && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: {
        gte: new Date(props.body.updated_at_from),
        ...(props.body.updated_at_to !== undefined && {
          lte: new Date(props.body.updated_at_to),
        }),
      },
    }),
    ...(props.body.updated_at_to !== undefined &&
      props.body.updated_at_from === undefined && {
        updated_at: {
          lte: new Date(props.body.updated_at_to),
        },
      }),
  };
  // Build ORDER BY
  const sortField = props.body.sort?.startsWith("-")
    ? props.body.sort.slice(1)
    : props.body.sort;
  const sortDirection =
    props.body.sort?.startsWith("-") || props.body.sort === undefined
      ? ("desc" as const)
      : ("asc" as const);
  const orderByInput: Prisma.shopping_mall_order_itemsOrderByWithRelationInput =
    sortField === "status"
      ? { status: sortDirection }
      : sortField === "price"
        ? { price: sortDirection }
        : sortField === "updated_at"
          ? { updated_at: sortDirection }
          : { created_at: "desc" as const };
  // Query data
  const data = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: whereInput,
  });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    ShoppingMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
