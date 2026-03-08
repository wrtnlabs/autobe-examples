import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_order_itemsWhereInput = {
    order: {
      customer_id: props.customer.id,
    },
    ...(props.body.include_deleted === null ||
    props.body.include_deleted === undefined
      ? { deleted_at: null }
      : {}),
    ...(props.body.item_status !== undefined
      ? { item_status: props.body.item_status }
      : {}),
    ...(props.body.order_id !== undefined
      ? { order_id: props.body.order_id }
      : {}),
    ...(props.body.product_id !== undefined
      ? { product_id: props.body.product_id }
      : {}),
    ...(props.body.product_variant_id !== undefined
      ? { product_variant_id: props.body.product_variant_id }
      : {}),
    ...(props.body.created_at_from !== undefined
      ? { created_at: { gte: props.body.created_at_from } }
      : {}),
    ...(props.body.created_at_to !== undefined
      ? { created_at: { lte: props.body.created_at_to } }
      : {}),
    ...(props.body.updated_at_from !== undefined
      ? { updated_at: { gte: props.body.updated_at_from } }
      : {}),
    ...(props.body.updated_at_to !== undefined
      ? { updated_at: { lte: props.body.updated_at_to } }
      : {}),
  };
  const orderBy: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput[] = [
    {
      [props.body.sort ?? "created_at"]: props.body.order ?? "DESC",
    } as Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput,
  ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where,
      include: { order: true },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({ where }),
  ]);
  const resultData: IEcommerceMallOrderItem.ISummary[] = data.map((item) => {
    const order: IEcommerceMallOrder.ISummary = {
      id: item.order.id,
      order_number: item.order.order_number,
      total_price: item.order.total_price,
      overall_status: item.order.overall_status,
      created_at: toISOStringSafe(item.order.created_at),
      updated_at: toISOStringSafe(item.order.updated_at),
      deleted_at:
        item.order.deleted_at !== null
          ? toISOStringSafe(item.order.deleted_at)
          : null,
    };
    return {
      id: item.id,
      order,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      itemStatus: typia.assert<
        "shipped" | "delivered" | "cancelled" | "paid" | "refunded"
      >(item.item_status),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      productSnapshot: item.product_snapshot,
      variantSnapshot: item.variant_snapshot,
      sellerProfileSnapshot: item.seller_profile_snapshot,
    } satisfies IEcommerceMallOrderItem.ISummary;
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: resultData,
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
