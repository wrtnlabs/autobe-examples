import { ForbiddenException } from "@nestjs/common";

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

  // payload.id contains shopping_mall_customers.id (top-level user ID)
  // payload.session_id contains shopping_mall_customer_sessions.id
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_customer_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session is expired");
  }

  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: payload.id,
      is_email_verified: true,
    },
  });
  if (customer === null) {
    throw new ForbiddenException("Customer is not active or enrolled");
  }

  return payload;
}
