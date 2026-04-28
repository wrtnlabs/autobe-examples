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

  const customer = await MyGlobal.prisma.ecommerce_platform_customers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      sessions: {
        some: {
          id: payload.session_id,
          expired_at: { gt: new Date() },
          deleted_at: null,
        },
      },
    },
  });

  if (customer === null || customer.is_banned) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}