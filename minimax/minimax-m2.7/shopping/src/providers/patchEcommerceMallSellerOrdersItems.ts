import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrdersItems(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build date filter conditions
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_at_from) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  // Build WHERE clause with mandatory seller filter
  const whereInput = {
    product: {
      ecommerce_mall_seller_id: props.seller.id,
    },
    ...(props.body.status?.length && {
      status: { in: props.body.status },
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
    ...(props.body.product_id && {
      ecommerce_mall_product_id: props.body.product_id,
    }),
    ...(props.body.variant_id && {
      ecommerce_mall_product_variant_id: props.body.variant_id,
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Build ORDER BY from sort parameters
  const sortBy = props.body.sort_by ?? "created_at";
  const sortDir = props.body.sort_direction ?? "desc";
  let orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  switch (sortBy) {
    case "unit_price":
      orderByInput = { unit_price: sortDir as "asc" | "desc" };
      break;
    case "quantity":
      orderByInput = { quantity: sortDir as "asc" | "desc" };
      break;
    default:
      orderByInput = { created_at: sortDir as "asc" | "desc" };
  }
  // Query order items with transformer select
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  // Transform to response DTOs
  const transformedItems = await ArrayUtil.asyncMap(
    orderItems,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedItems,
  };
}
