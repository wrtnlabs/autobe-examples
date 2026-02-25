import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerAtSummaryTransformer } from "../transformers/EcommerceCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerSession> {
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.findUnique({
    where: { id: props.sessionId },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      expired_at: true,
      deleted_at: true,
      customer: EcommerceCustomerAtSummaryTransformer.select(),
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  if (session.deleted_at) {
    throw new HttpException("Session not found", 404);
  }
  const now = new Date().toISOString();
  if (now > session.expired_at.toISOString()) {
    throw new HttpException("Session expired", 401);
  }
  if (session.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expired_at: toISOStringSafe(session.expired_at),
    deleted_at: session.deleted_at ? toISOStringSafe(session.deleted_at) : null,
    customer: await EcommerceCustomerAtSummaryTransformer.transform(
      session.customer,
    ),
  };
}
