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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceRefundRequestAtSummaryTransformer } from "../transformers/EcommerceRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItemsItemIdRefundRequests(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  // Validate order item exists and belongs to the specified order
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findFirst({
    where: {
      id: props.itemId,
      ecommerce_order_id: props.orderId,
      ecommerce_seller_id: props.seller.id,
    },
    select: {
      id: true,
      status: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or unauthorized", 404);
  }
  // Apply filters from request body
  const whereInput: Prisma.ecommerce_refund_requestsWhereInput = {
    ecommerce_order_item_id: props.itemId,
    ...(props.body.status !== undefined && { status: props.body.status }),
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
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  // Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch refund requests
  const records = await MyGlobal.prisma.ecommerce_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceRefundRequestAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: whereInput,
  });
  // Transform and return
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
