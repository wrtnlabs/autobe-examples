import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceRefundRequestAtSummaryTransformer } from "../transformers/EcommerceRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersOrderIdItemsItemIdRefundRequests(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  // Validate order item exists and belongs to the specified order
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        ecommerce_order_id: true,
        status: true,
      },
    });
  // Verify order item belongs to the specified order
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to specified order",
      404,
    );
  }
  // Verify customer owns the order (authorization) - fetch order to get customer_id
  const order = await MyGlobal.prisma.ecommerce_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_customer_id: true,
    },
  });
  if (order.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check order item status is delivered (business rule: refund requests only for delivered items)
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund requests only allowed for delivered items",
      400,
    );
  }
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_refund_requestsWhereInput = {
    ecommerce_order_item_id: props.itemId,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
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
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  // Fetch refund requests with pagination
  const records = await MyGlobal.prisma.ecommerce_refund_requests.findMany({
    where: whereInput,
    ...EcommerceRefundRequestAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceRefundRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceRefundRequest.ISummary;
}
