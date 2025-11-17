import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

export async function customerAuthorize(request: { headers: { authorization?: string } }): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify session existence and validity
  const session = await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
    where: {
      id: payload.session_id,
      shoppingMallCustomer: {
        id: payload.id
      },
      expired_at: null
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session not valid");
  }

  // Verify customer existence
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: payload.id }
  });

  if (customer === null) {
    throw new ForbiddenException("Customer not found");
  }

  return payload;
}
