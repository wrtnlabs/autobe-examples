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
import { EcommerceCustomerSessionTransformer } from "../transformers/EcommerceCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCustomerSession> {
  const now = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.ecommerce_customer_sessions.findUnique({
    where: {
      id: props.sessionId,
      customer_id: props.customer.id,
    },
    ...EcommerceCustomerSessionTransformer.select(),
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  if (now >= toISOStringSafe(session.expired_at)) {
    throw new HttpException("Session expired", 403);
  }
  return await EcommerceCustomerSessionTransformer.transform(session);
}
