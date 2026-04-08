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
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_customer_sessionsWhereInput = {
    ecommerce_customer_id: props.customer.id,
    ...(props.body.created_at && {
      created_at: {
        ...(props.body.created_at.gte && {
          gte: new Date(props.body.created_at.gte),
        }),
        ...(props.body.created_at.lte && {
          lte: new Date(props.body.created_at.lte),
        }),
      },
    }),
    ...(props.body.expired_at && {
      expired_at: {
        ...(props.body.expired_at.gte && {
          gte: new Date(props.body.expired_at.gte),
        }),
        ...(props.body.expired_at.lte && {
          lte: new Date(props.body.expired_at.lte),
        }),
      },
    }),
    ...(props.body.ip && {
      ip: { contains: props.body.ip },
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_customer_sessions.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" as const },
    skip,
    take: limit,
    ...EcommerceCustomerSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_customer_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceCustomerSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceCustomerSession.ISummary;
}
