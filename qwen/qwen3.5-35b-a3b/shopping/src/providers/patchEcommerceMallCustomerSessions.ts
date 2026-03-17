import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_customer_sessionsWhereInput = {
    deleted_at: null,
    ...(props.body.status === "active" ? { status: "active" } : {}),
    ...(props.body.status === "inactive" ? { status: "inactive" } : {}),
    ...(props.body.device_type !== undefined
      ? { device_type: props.body.device_type }
      : {}),
    ...(props.body.ip !== undefined ? { ip: { contains: props.body.ip } } : {}),
    ...(props.body.created_at !== undefined
      ? { created_at: { gte: new Date(props.body.created_at) } }
      : {}),
    ...(props.body.updated_at !== undefined
      ? { updated_at: { gte: new Date(props.body.updated_at) } }
      : {}),
  } satisfies Prisma.ecommerce_mall_customer_sessionsWhereInput;
  const orderByInput = {
    created_at: "desc",
  } satisfies Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      created_at: true,
      updated_at: true,
      expired_at: true,
      deleted_at: true,
    } satisfies Prisma.ecommerce_mall_customer_sessionsSelect,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(data, async (session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        session.customer,
      ),
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
      expired_at: session.expired_at.toISOString(),
      deleted_at: session.deleted_at?.toISOString() ?? null,
    })),
  };
}
