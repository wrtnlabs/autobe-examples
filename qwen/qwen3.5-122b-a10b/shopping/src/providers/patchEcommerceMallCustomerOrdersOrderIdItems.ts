import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Validate order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
  // Build where clause
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    ecommerce_mall_order_id: props.orderId,
    ...(props.body.status !== undefined && {
      status: Array.isArray(props.body.status)
        ? { in: props.body.status }
        : props.body.status,
    }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.product_variant_id !== undefined &&
      props.body.product_variant_id !== null && {
        ecommerce_mall_product_variant_id: props.body.product_variant_id,
      }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build orderBy
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    props.body.sort_by === "status"
      ? { status: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "quantity"
        ? { quantity: props.body.sort_order ?? "desc" }
        : props.body.sort_by === "unit_price"
          ? { unit_price: props.body.sort_order ?? "desc" }
          : { created_at: props.body.sort_order ?? "desc" };
  // Fetch data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({ where: whereInput }),
  ]);
  // Transform results
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
