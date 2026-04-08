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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminCustomerSessions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = body.sortBy ?? "created_at";
  const sortOrder = body.sortOrder ?? "desc";
  const orderBy = {
    [sortBy]: sortOrder,
  } satisfies Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput;
  const where: Prisma.ecommerce_mall_customer_sessionsWhereInput = {};
  const createdAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_customer_sessions"> =
    {};
  if (body.createdAtFrom !== undefined && body.createdAtFrom !== null) {
    createdAtFilter.gte = body.createdAtFrom;
  }
  if (body.createdAtTo !== undefined && body.createdAtTo !== null) {
    createdAtFilter.lte = body.createdAtTo;
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }
  const expiredAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_customer_sessions"> =
    {};
  if (body.expiredAtFrom !== undefined && body.expiredAtFrom !== null) {
    expiredAtFilter.gte = body.expiredAtFrom;
  }
  if (body.expiredAtTo !== undefined && body.expiredAtTo !== null) {
    expiredAtFilter.lte = body.expiredAtTo;
  }
  if (body.status === "active") {
    expiredAtFilter.gt = new Date().toISOString();
  } else if (body.status === "expired") {
    expiredAtFilter.lte = new Date().toISOString();
  }
  if (Object.keys(expiredAtFilter).length > 0) {
    where.expired_at = expiredAtFilter;
  }
  if (body.ip !== undefined && body.ip !== null && body.ip.length > 0) {
    where.ip = {
      contains: body.ip,
    };
  }
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where,
  });
  const data = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
