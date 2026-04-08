import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestAtSummaryTransformer } from "../transformers/EcommerceMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const requestedAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.requestedAtFrom !== undefined) {
    requestedAtFilter.gte = new Date(props.body.requestedAtFrom);
  }
  if (props.body.requestedAtTo !== undefined) {
    requestedAtFilter.lte = new Date(props.body.requestedAtTo);
  }
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.orderItemId !== undefined && {
      order_item_id: props.body.orderItemId,
    }),
    ...(Object.keys(requestedAtFilter).length > 0 && {
      requested_at: requestedAtFilter,
    }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
