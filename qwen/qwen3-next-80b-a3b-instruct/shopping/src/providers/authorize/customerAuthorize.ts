import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

export async function customerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level customer table ID
  // Query customer_sessions for active session validation
  const customerSession = await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
    where: {
      id: payload.session_id,
      // Validate that session has not expired
      expired_at: { gt: new Date() },
      // Ensure customer account is active and not deleted
      customer: {
        id: payload.id,
        deleted_at: null,
      },
    },
  });

  if (customerSession === null) {
    throw new ForbiddenException("You're not enrolled or your session has expired");
  }

  return payload;
}