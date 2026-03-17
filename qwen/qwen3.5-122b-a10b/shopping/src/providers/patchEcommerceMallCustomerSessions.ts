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
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_customer_sessionsWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.status === "active" && {
      expired_at: { gt: new Date() },
    }),
    ...(props.body.status === "expired" && {
      expired_at: { lte: new Date() },
    }),
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.href && { href: { contains: props.body.href } }),
    ...(props.body.referrer && { referrer: { contains: props.body.referrer } }),
  } satisfies Prisma.ecommerce_mall_customer_sessionsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : { created_at: "desc" as const };
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      sessions,
      EcommerceMallCustomerSessionAtSummaryTransformer.transform,
    ),
  };
}
