import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallRefundRequestAtSummaryTransformer } from "../transformers/ShoppingMallRefundRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IShoppingMallRefundRequest.IRequest;
}): Promise<IPageIShoppingMallRefundRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_refund_requestsWhereInput = {};
  if (props.body.status) where.status = props.body.status;
  if (props.body.customer_id) where.customer_id = props.body.customer_id;
  if (props.body.responder_id) where.responder_id = props.body.responder_id;
  if (props.body.created_at) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (
      props.body.created_at.start &&
      typeof props.body.created_at.start === "string"
    )
      createdAt.gte = props.body.created_at.start;
    if (
      props.body.created_at.end &&
      typeof props.body.created_at.end === "string"
    )
      createdAt.lte = props.body.created_at.end;
    where.created_at = createdAt;
  }
  if (props.body.responded_at) {
    const respondedAt: Prisma.DateTimeFilter = {};
    if (
      props.body.responded_at.start &&
      typeof props.body.responded_at.start === "string"
    )
      respondedAt.gte = props.body.responded_at.start;
    if (
      props.body.responded_at.end &&
      typeof props.body.responded_at.end === "string"
    )
      respondedAt.lte = props.body.responded_at.end;
    where.responded_at = respondedAt;
  }
  const data = await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
    skip,
    take: limit,
    where,
    orderBy: { created_at: "desc" },
    ...ShoppingMallRefundRequestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_refund_requests.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundRequestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
