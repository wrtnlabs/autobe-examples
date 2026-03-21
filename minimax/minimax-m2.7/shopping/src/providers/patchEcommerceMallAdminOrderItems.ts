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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrderItems(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const { body } = props;
  // Pagination defaults
  const page = (body.page ?? 1) < 1 ? 1 : (body.page ?? 1);
  const limit = Math.min(body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereInput = {
    ...(body.status?.length ? { status: { in: body.status } } : {}),
    ...(body.created_at_from
      ? { created_at: { gte: new Date(body.created_at_from) } }
      : {}),
    ...(body.created_at_to
      ? { created_at: { lte: new Date(body.created_at_to) } }
      : {}),
    ...(body.product_id ? { ecommerce_mall_product_id: body.product_id } : {}),
    ...(body.variant_id
      ? { ecommerce_mall_product_variant_id: body.variant_id }
      : {}),
    ...(body.seller_id
      ? { product: { ecommerce_mall_seller_id: body.seller_id } }
      : {}),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Sort configuration
  const sortDirection =
    body.sort_direction === "asc" ? ("asc" as const) : ("desc" as const);
  const orderByInput = (
    body.sort_by === "unit_price"
      ? { unit_price: sortDirection }
      : body.sort_by === "quantity"
        ? { quantity: sortDirection }
        : { created_at: sortDirection }
  ) satisfies Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  // Query order items
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  // Transform results using transformer
  const items = await ArrayUtil.asyncMap(
    data,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: items,
  };
}
