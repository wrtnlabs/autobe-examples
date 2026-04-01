import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerRefundRequestsPending(props: {
  seller: SellerPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for the refund requests query
  const whereInput: Prisma.ecommerce_mall_refund_requestsWhereInput = {
    status: "pending",
    deleted_at: null,
    ...(props.body.customerIds?.length
      ? {
          ecommerce_mall_customer_id: { in: props.body.customerIds },
        }
      : {}),
    ...(props.body.orderItemId
      ? {
          ecommerce_mall_order_item_id: props.body.orderItemId,
        }
      : {}),
    ...(props.body.startDate
      ? {
          submitted_at: {
            gte: toISOStringSafe(new Date(props.body.startDate)),
          },
        }
      : {}),
    ...(props.body.endDate
      ? {
          submitted_at: { lte: toISOStringSafe(new Date(props.body.endDate)) },
        }
      : {}),
    // Filter by seller's products via order item → seller_snapshot → sellerId
    orderItem: {
      sellerSnapshot: {
        id: props.seller.id,
      },
    },
  };
  // Add reason keyword filter
  if (props.body.reasonKeywords) {
    whereInput.reason = {
      contains: props.body.reasonKeywords,
      mode: "insensitive" as const,
    };
  }
  // Get total count first
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  // Fetch paginated results with all needed fields for amount filtering
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [
      { submitted_at: "desc" },
      { created_at: "desc" },
    ] satisfies Prisma.ecommerce_mall_refund_requestsOrderByWithRelationInput[],
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  // Post-filter by amount if needed (unit_price × quantity)
  let filteredData = data;
  if (
    props.body.minAmount !== undefined ||
    props.body.maxAmount !== undefined
  ) {
    filteredData = data.filter((item) => {
      const unitPrice = Number(item.orderItem.unit_price);
      const quantity = item.orderItem.quantity;
      const refundAmount = unitPrice * quantity;
      if (
        props.body.minAmount !== undefined &&
        refundAmount < props.body.minAmount
      ) {
        return false;
      }
      if (
        props.body.maxAmount !== undefined &&
        refundAmount > props.body.maxAmount
      ) {
        return false;
      }
      return true;
    });
  }
  return {
    data: await ArrayUtil.asyncMap(
      filteredData,
      EcommerceMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
