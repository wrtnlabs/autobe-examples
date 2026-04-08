import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

export async function customerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CustomerPayload> {
  let payload: CustomerPayload;

  try {
    payload = jwtAuthorize({ request }) as CustomerPayload;
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException("Invalid token");
  }

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const customer = await MyGlobal.prisma.mall_platform_customers.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.mall_platform_customer_sessions.findFirst({
    where: {
      id: payload.session_id,
      mall_platform_customer_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Session expired");
  }

  return payload;
}