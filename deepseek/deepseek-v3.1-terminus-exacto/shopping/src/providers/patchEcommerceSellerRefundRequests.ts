import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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

export async function patchEcommerceSellerRefundRequests(props: {
  seller: SellerPayload;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get the latest status history IDs for filtering
  const latestStatusHistoryIds = props.body.status
    ? await MyGlobal.prisma.ecommerce_refund_request_statuses
        .findMany({
          where: { status: props.body.status },
          distinct: ["ecommerce_refund_request_id"],
          orderBy: { created_at: "desc" },
          select: { id: true, ecommerce_refund_request_id: true },
        })
        .then((histories) => histories.map((h) => h.id))
    : undefined;
  const whereInput = {
    deleted_at: null,
    seller: { id: props.seller.id },
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(latestStatusHistoryIds && {
      statusHistories: {
        some: {
          id: { in: latestStatusHistoryIds },
        },
      },
    }),
    ...(props.body.requested_at_start &&
      props.body.requested_at_end && {
        requested_at: {
          gte: props.body.requested_at_start,
          lte: props.body.requested_at_end,
        },
      }),
    ...(props.body.requested_at_start &&
      !props.body.requested_at_end && {
        requested_at: { gte: props.body.requested_at_start },
      }),
    ...(!props.body.requested_at_start &&
      props.body.requested_at_end && {
        requested_at: { lte: props.body.requested_at_end },
      }),
  } satisfies Prisma.ecommerce_refund_requestsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_refund_requests.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { requested_at: "desc" },
      ...EcommerceRefundRequestAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_refund_requests.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
