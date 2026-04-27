import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

export async function customerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const customer = await MyGlobal.prisma.e_commerce_mall_customers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      banned_at: null,
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.e_commerce_mall_customer_sessions.findFirst({
    where: {
      id: payload.session_id,
      e_commerce_mall_customer_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Your session has expired");
  }

  return payload;
}