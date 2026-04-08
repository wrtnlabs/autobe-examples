import { IEcommerceSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSessionStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerSessionStatus(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceSessionStatus> {
  const session =
    await MyGlobal.prisma.ecommerce_customer_sessions.findUniqueOrThrow({
      where: {
        id: props.customer.session_id,
        ecommerce_customer_id: props.customer.id,
      },
      select: {
        id: true,
        created_at: true,
        expired_at: true,
      },
    });
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  const result: IEcommerceSessionStatus = {
    type: "customer",
    id: session.id,
    user_id: props.customer.id,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
    grade: null,
  };
  return result;
}
