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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItemsOrderItemIdCancellationRequests(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItemCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallOrderItemCancellationRequest.ISummary> {
  // Verify order item exists and belongs to seller's products
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      productVariant: {
        product: {
          seller_id: props.seller.id,
        },
      },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found or not accessible", 404);
  }
  // Build filter conditions
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
    } satisfies Prisma.ecommerce_mall_order_item_cancellation_requestsWhereInput;
  // Pagination with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch records and count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.count({
      where: whereInput,
    }),
  ]);
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallOrderItemCancellationRequest.ISummary;
}
