import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const effectiveLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.ecommerce_mall_customer_sessionsWhereInput = {
    customer_id: props.customer.id,
  };
  if (props.body.status !== null && props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereInput.expired_at = { gt: new Date() };
    } else if (props.body.status === "invalidated") {
      whereInput.expired_at = { lte: new Date() };
    }
  }
  if (
    props.body.startDate !== null &&
    props.body.startDate !== undefined &&
    props.body.endDate !== null &&
    props.body.endDate !== undefined
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.startDate),
      lte: new Date(props.body.endDate),
    };
  } else {
    if (props.body.startDate !== null && props.body.startDate !== undefined) {
      whereInput.created_at = { gte: new Date(props.body.startDate) };
    }
    if (props.body.endDate !== null && props.body.endDate !== undefined) {
      whereInput.created_at = { lte: new Date(props.body.endDate) };
    }
  }
  if (
    props.body.locationSearch !== null &&
    props.body.locationSearch !== undefined
  ) {
    whereInput.ip = { contains: props.body.locationSearch };
  }
  const orderByInput = (
    props.body.sort === "last_activity"
      ? { expired_at: "desc" }
      : props.body.sort === "actor_type"
        ? { customer_id: "asc" }
        : { created_at: "desc" }
  ) satisfies Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
    where: whereInput,
    skip,
    take: effectiveLimit,
    orderBy: orderByInput,
    ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCustomerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: Math.ceil(total / effectiveLimit),
    } satisfies IPage.IPagination,
  };
}
