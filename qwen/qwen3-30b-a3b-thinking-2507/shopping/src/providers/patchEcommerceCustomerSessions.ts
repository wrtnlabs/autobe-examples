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
  const now = toISOStringSafe(new Date());
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_customer_sessionsWhereInput = {
    expired_at: { gt: now },
  };
  if (props.body.ip) where.ip = props.body.ip;
  if (props.body.href) where.href = props.body.href;
  if (props.body.referrer) where.referrer = props.body.referrer;
  const data = await MyGlobal.prisma.ecommerce_customer_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceCustomerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_customer_sessions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceCustomerSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceCustomerSession.ISummary;
}
