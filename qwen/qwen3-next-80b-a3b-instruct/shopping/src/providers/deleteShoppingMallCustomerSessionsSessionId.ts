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

export async function deleteShoppingMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: props.sessionId },
    data: { is_active: false },
  });
}
