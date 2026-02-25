import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerSessionAtSummaryTransformer } from "../transformers/ShoppingMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerSession.IRequest;
}): Promise<IPageIShoppingMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause from scratch without spread operations
  let where: Prisma.shopping_mall_customer_sessionsWhereInput = {};
  // Status filtering: active, expired, invalidated
  if (props.body.status) {
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;
    if (props.body.status === "active") {
      where.expired_at = { gt: now };
    } else if (props.body.status === "expired") {
      where.expired_at = { lte: now };
    }
    // 'invalidated' is treated as expired - so no additional filter needed
  }
  // Filter by token_issued_at_range (created_at)
  if (props.body.token_issued_at_range) {
    if (
      props.body.token_issued_at_range.min &&
      props.body.token_issued_at_range.max
    ) {
      where.created_at = {
        gte: props.body.token_issued_at_range.min,
        lte: props.body.token_issued_at_range.max,
      };
    } else if (props.body.token_issued_at_range.min) {
      where.created_at = { gte: props.body.token_issued_at_range.min };
    } else if (props.body.token_issued_at_range.max) {
      where.created_at = { lte: props.body.token_issued_at_range.max };
    }
  }
  // Filter by token_expires_at_range (expired_at)
  if (props.body.token_expires_at_range) {
    if (
      props.body.token_expires_at_range.min &&
      props.body.token_expires_at_range.max
    ) {
      where.expired_at = {
        gte: props.body.token_expires_at_range.min,
        lte: props.body.token_expires_at_range.max,
      };
    } else if (props.body.token_expires_at_range.min) {
      where.expired_at = { gte: props.body.token_expires_at_range.min };
    } else if (props.body.token_expires_at_range.max) {
      where.expired_at = { lte: props.body.token_expires_at_range.max };
    }
  }
  const data = await MyGlobal.prisma.shopping_mall_customer_sessions.findMany({
    skip,
    take: limit,
    where,
    orderBy: { created_at: "desc" },
    ...ShoppingMallCustomerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_customer_sessions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallCustomerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
