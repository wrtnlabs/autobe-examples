import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderAtSummaryTransformer } from "../transformers/EcommerceOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrders(props: {
  customer: CustomerPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IPageIEcommerceOrder.ISummary> {
  // Parse pagination parameters
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 100;
  const skip = page * limit;
  // Build where clause with filters and row-level security
  const whereInput: Prisma.ecommerce_ordersWhereInput = {
    ecommerce_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.order_number && {
      order_number: {
        contains: props.body.order_number,
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Execute queries
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_orders.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceOrderAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_orders.count({
      where: whereInput,
    }),
  ]);
  // Calculate pagination metadata
  const current = page + 1; // 1-indexed for response
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceOrderAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceOrder.ISummary;
}
