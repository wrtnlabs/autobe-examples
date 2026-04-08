import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

export async function customerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not a customer`);
  }

  const session = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
    where: {
      ecommerce_mall_customer_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Session expired or invalid");
  }

  return payload;
}