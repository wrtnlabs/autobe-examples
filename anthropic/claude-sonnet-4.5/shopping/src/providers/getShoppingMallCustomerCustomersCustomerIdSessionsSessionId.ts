import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerCustomersCustomerIdSessionsSessionId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSession> {
  const { customer, customerId, sessionId } = props;

  // Authorization check: Verify requesting customer matches the customerId parameter
  if (customer.id !== customerId) {
    throw new HttpException(
      "Unauthorized: You can only access your own sessions",
      403,
    );
  }

  // Retrieve the specific session
  const session =
    await MyGlobal.prisma.shopping_mall_sessions.findUniqueOrThrow({
      where: { id: sessionId },
    });

  // Authorization check: Verify session belongs to the requesting customer
  if (session.customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: This session does not belong to you",
      403,
    );
  }

  // Verify session is for a customer (not seller or admin)
  if (session.user_type !== "customer") {
    throw new HttpException(
      "Invalid session type: This session is not a customer session",
      400,
    );
  }

  // Map Prisma result to DTO with proper type conversions
  return {
    id: session.id as string & tags.Format<"uuid">,
    user_type: session.user_type,
    refresh_token_expires_at: toISOStringSafe(session.refresh_token_expires_at),
    ip_address: session.ip_address,
    device_type: session.device_type ?? undefined,
    device_name: session.device_name ?? undefined,
    browser_name: session.browser_name ?? undefined,
    operating_system: session.operating_system ?? undefined,
    approximate_location: session.approximate_location ?? undefined,
    is_revoked: session.is_revoked,
    revoked_at: session.revoked_at
      ? toISOStringSafe(session.revoked_at)
      : undefined,
    last_activity_at: toISOStringSafe(session.last_activity_at),
    created_at: toISOStringSafe(session.created_at),
  };
}
