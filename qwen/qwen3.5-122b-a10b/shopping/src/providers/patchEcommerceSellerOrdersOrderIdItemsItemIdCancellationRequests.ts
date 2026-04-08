import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItemsItemIdCancellationRequests(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  // Verify order item exists and belongs to the specified order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      ecommerce_order_id: true,
      ecommerce_seller_id: true,
      status: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  // Verify order item belongs to the specified order
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Verify seller owns the product (via order item's seller_id)
  if (orderItem.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business rule: Cancellation requests are only valid for order items with "paid" status
  // Per analysis sections 327 and 386, items with "shipped" or "delivered" status cannot have cancellation requests
  if (orderItem.status !== "paid") {
    throw new HttpException(
      "Cancellation requests are only allowed for order items with paid status",
      400,
    );
  }
  // Build where clause for cancellation requests
  const whereInput: Prisma.ecommerce_cancellation_requestsWhereInput = {
    ecommerce_order_item_id: props.itemId,
    ...(props.body.status && { status: props.body.status }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query cancellation requests
  const records =
    await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      ...EcommerceCancellationRequestAtSummaryTransformer.select(),
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_cancellation_requests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCancellationRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceCancellationRequest.ISummary;
}
