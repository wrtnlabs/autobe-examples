import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemsOrderItemIdCancellationRequests(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallOrderItemCancellationRequest.ISummary> {
  // Verify order item ownership - customer can only view their own order items
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findUnique(
    {
      where: { id: props.orderItemId },
      select: {
        ecommerce_mall_order_id: true,
        deleted_at: true,
      },
    },
  );
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.deleted_at !== null) {
    throw new HttpException("Order item not found", 404);
  }
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUnique({
    where: { id: orderItem.ecommerce_mall_order_id },
    select: {
      ecommerce_mall_customer_id: true,
      deleted_at: true,
    },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_item_cancellation_requestsWhereInput =
    {
      order_item_id: props.orderItemId,
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
      ...(props.body.requested_at_from && {
        requested_at: {
          gte: new Date(props.body.requested_at_from),
        },
      }),
      ...(props.body.requested_at_to && {
        requested_at: {
          lte: new Date(props.body.requested_at_to),
        },
      }),
      ...(props.body.responded_at_from && {
        responded_at: {
          gte: new Date(props.body.responded_at_from),
        },
      }),
      ...(props.body.responded_at_to && {
        responded_at: {
          lte: new Date(props.body.responded_at_to),
        },
      }),
    };
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.count(
      {
        where: whereInput,
      },
    );
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
