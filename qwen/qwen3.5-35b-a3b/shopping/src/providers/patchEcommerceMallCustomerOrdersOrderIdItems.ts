import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItems(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    ecommerce_mall_order_id: props.orderId,
    deleted_at: null,
    ...(props.body.product_name !== undefined && {
      product_name: {
        contains: props.body.product_name,
        mode: "insensitive",
      },
    }),
    ...(props.body.variant_sku !== undefined && {
      product_sku: props.body.variant_sku,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
