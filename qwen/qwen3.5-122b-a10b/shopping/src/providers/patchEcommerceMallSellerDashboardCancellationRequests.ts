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

export async function patchEcommerceMallSellerDashboardCancellationRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItemCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallOrderItemCancellationRequest.ISummary> {
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause for seller-scoped filtering
  const whereInput = {
    deleted_at: null,
    orderItem: {
      deleted_at: null,
      productVariant: {
        deleted_at: null,
        product: {
          seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    },
    ...(props.body.status && {
      status: props.body.status,
    }),
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
  // Fetch paginated records
  const records =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { requested_at: "desc" },
        ...EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.select(),
      },
    );
  // Count total records
  const total =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.count(
      {
        where: whereInput,
      },
    );
  // Transform records to DTOs
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallOrderItemCancellationRequestAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data,
  } satisfies IPageIEcommerceMallOrderItemCancellationRequest.ISummary;
}
