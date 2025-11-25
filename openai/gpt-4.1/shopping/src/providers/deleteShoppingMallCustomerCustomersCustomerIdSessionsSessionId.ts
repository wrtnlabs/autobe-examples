import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCustomersCustomerIdSessionsSessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Retrieve the session for the given sessionId and customerId
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.sessionId,
        shopping_mall_customer_id: props.customerId,
      },
    });

  if (session === null) {
    throw new HttpException(
      "Session not found or does not belong to the specified customer.",
      404,
    );
  }

  // Only the user who owns the session can delete it (self-logout)
  if (props.customer.id !== props.customerId) {
    throw new HttpException(
      "You are not authorized to delete this session.",
      403,
    );
  }

  // Perform a hard deletion of the session record (no soft delete field)
  await MyGlobal.prisma.shopping_mall_customer_sessions.delete({
    where: { id: props.sessionId },
  });
}
