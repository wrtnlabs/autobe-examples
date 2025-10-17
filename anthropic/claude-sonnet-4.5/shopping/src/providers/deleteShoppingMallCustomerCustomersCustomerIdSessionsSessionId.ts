import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { customer, customerId, sessionId } = props;

  // Authorization: Verify the customerId in path matches the authenticated customer
  if (customer.id !== customerId) {
    throw new HttpException(
      "Unauthorized: Cannot revoke sessions for other customers",
      403,
    );
  }

  // Fetch the session to verify it exists and belongs to this customer
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      id: sessionId,
      customer_id: customerId,
      user_type: "customer",
    },
  });

  if (!session) {
    throw new HttpException(
      "Session not found or does not belong to this customer",
      404,
    );
  }

  // Revoke the session by setting is_revoked to true and recording revoked_at timestamp
  // This operation is idempotent - revoking an already-revoked session is safe
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: {
      id: sessionId,
    },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(new Date()),
    },
  });
}
