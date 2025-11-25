import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerIdSessionsSessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Only allow deletion for the session belonging to the given customer
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  if (session.shopping_mall_customer_id !== props.customerId) {
    throw new HttpException(
      "Session does not belong to the specified customer",
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_customer_sessions.delete({
    where: { id: props.sessionId },
  });
}
