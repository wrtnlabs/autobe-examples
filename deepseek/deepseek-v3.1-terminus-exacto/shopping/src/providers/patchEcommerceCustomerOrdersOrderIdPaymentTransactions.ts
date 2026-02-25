import { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePaymentTransaction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePaymentTransactionAtSummaryTransformer } from "../transformers/EcommercePaymentTransactionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdPaymentTransactions(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommercePaymentTransaction.IRequest;
}): Promise<IPageIEcommercePaymentTransaction.ISummary> {
  // Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, customer_id: true },
  });
  if (order.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.ecommerce_payment_transactionsWhereInput = {
    order_id: props.orderId,
    ...(props.body.payment_method && {
      payment_method: props.body.payment_method,
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.min_amount !== undefined && {
      amount: { gte: props.body.min_amount },
    }),
    ...(props.body.max_amount !== undefined && {
      amount: { lte: props.body.max_amount },
    }),
    ...(props.body.gateway_name && { gateway_name: props.body.gateway_name }),
    ...(props.body.created_at_min && {
      created_at: {
        gte: new Date(props.body.created_at_min),
      },
    }),
    ...(props.body.created_at_max && {
      created_at: {
        lte: new Date(props.body.created_at_max),
      },
    }),
  };
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.ecommerce_payment_transactions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommercePaymentTransactionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_payment_transactions.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePaymentTransactionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
