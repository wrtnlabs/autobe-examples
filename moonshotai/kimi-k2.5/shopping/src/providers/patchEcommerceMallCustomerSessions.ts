import { IEcommerceMallActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActorType";
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
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build base where - customer can only view their own sessions
  const whereConditions: Prisma.ecommerce_mall_customer_sessionsWhereInput[] = [
    { ecommerce_mall_customer_id: props.customer.id },
  ];
  // Add userId filter if provided (security check: must match customer.id)
  if (props.body.userId !== undefined && props.body.userId !== null) {
    if (props.body.userId !== props.customer.id) {
      throw new HttpException("Forbidden: Can only access own sessions", 403);
    }
  }
  // Add IP filter with LIKE pattern
  if (
    props.body.ip !== undefined &&
    props.body.ip !== null &&
    props.body.ip.length > 0
  ) {
    whereConditions.push({ ip: { contains: props.body.ip } });
  }
  // Add referrer filter with LIKE pattern
  if (
    props.body.referrer !== undefined &&
    props.body.referrer !== null &&
    props.body.referrer.length > 0
  ) {
    whereConditions.push({ referrer: { contains: props.body.referrer } });
  }
  // Build created_at range filter
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereConditions.push({ created_at: createdAtFilter });
  }
  // Build expired_at range filter
  const expiredAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.expiredAtFrom !== undefined &&
    props.body.expiredAtFrom !== null
  ) {
    expiredAtFilter.gte = new Date(props.body.expiredAtFrom);
  }
  if (props.body.expiredAtTo !== undefined && props.body.expiredAtTo !== null) {
    expiredAtFilter.lte = new Date(props.body.expiredAtTo);
  }
  if (Object.keys(expiredAtFilter).length > 0) {
    whereConditions.push({ expired_at: expiredAtFilter });
  }
  // Add isActive filter
  if (props.body.isActive === true) {
    whereConditions.push({ expired_at: { gt: new Date() } });
  } else if (props.body.isActive === false) {
    whereConditions.push({ expired_at: { lte: new Date() } });
  }
  // Add cursor condition for pagination
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    whereConditions.push({ created_at: { lt: new Date(props.body.cursor) } });
  }
  // Build final where
  const where: Prisma.ecommerce_mall_customer_sessionsWhereInput =
    whereConditions.length === 1
      ? whereConditions[0]!
      : { AND: whereConditions };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where,
  });
  // Query sessions
  const sessions =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where,
      skip:
        props.body.cursor !== undefined && props.body.cursor !== null
          ? undefined
          : skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    sessions,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit) || 0;
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
