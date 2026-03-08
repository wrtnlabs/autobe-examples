import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { is_banned: true },
    });
  if (customer.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;
  const whereInput: Prisma.ecommerce_mall_customer_sessionsWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: now },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: now },
    }),
    ...(props.body.created_from !== undefined && {
      created_at: { gte: props.body.created_from },
    }),
    ...(props.body.created_to !== undefined && {
      created_at: { lte: props.body.created_to },
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip, mode: "insensitive" as const },
    }),
    ...(props.body.href !== undefined && {
      href: { contains: props.body.href, mode: "insensitive" as const },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: { contains: props.body.referrer, mode: "insensitive" as const },
    }),
  } satisfies Prisma.ecommerce_mall_customer_sessionsWhereInput;
  const orderByInput = (
    props.body.sortOrder === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where: whereInput,
      skip,
      take: pageSize,
      orderBy: orderByInput,
      select: {
        id: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        href: true,
        ip: true,
        created_at: true,
        expired_at: true,
        referrer: true,
      } satisfies Prisma.ecommerce_mall_customer_sessionsSelect,
    }),
    MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (session) =>
      await EcommerceMallCustomerSessionAtSummaryTransformer.transform(session),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallCustomerSession.ISummary;
}
