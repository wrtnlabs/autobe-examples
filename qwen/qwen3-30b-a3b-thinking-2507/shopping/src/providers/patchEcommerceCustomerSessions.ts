import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerSession.IRequest;
}): Promise<IPageIEcommerceCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const sortField = props.body.sortField || "created_at";
  const sortDirection = props.body.sortDirection === "asc" ? "asc" : "desc";
  const validSortFields = [
    "customer_id",
    "ip",
    "href",
    "referrer",
    "created_at",
    "updated_at",
    "expired_at",
  ];
  const safeSortField = validSortFields.includes(sortField)
    ? sortField
    : "created_at";
  const where: Prisma.ecommerce_customer_sessionsWhereInput = {
    deleted_at: null,
    ...(props.body.customer_id ? { customer_id: props.body.customer_id } : {}),
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.href ? { href: props.body.href } : {}),
    ...(props.body.referrer ? { referrer: props.body.referrer } : {}),
    ...(props.body.expired_at ? { expired_at: props.body.expired_at } : {}),
  };
  const total = await MyGlobal.prisma.ecommerce_customer_sessions.count({
    where,
  });
  const sessions = await MyGlobal.prisma.ecommerce_customer_sessions.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [safeSortField]: sortDirection },
    ...EcommerceCustomerSessionAtSummaryTransformer.select(),
  });
  const data = await ArrayUtil.asyncMap(sessions, (session) =>
    EcommerceCustomerSessionAtSummaryTransformer.transform(session),
  );
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return { data, pagination } satisfies IPageIEcommerceCustomerSession.ISummary;
}
