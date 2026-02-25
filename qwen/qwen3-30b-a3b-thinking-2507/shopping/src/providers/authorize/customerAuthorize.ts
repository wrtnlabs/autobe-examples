import { ForbiddenException } from "@nestjs/common";
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

  const customer = await MyGlobal.prisma.ecommerce_customers.findFirst({
    where: {
      id: payload.id,
      email_verified: true,
      is_suspended: false,
      deleted_at: null
    },
  });

  if (customer === null) {
    throw new ForbiddenException("Customer not found or account disabled");
  }

  return payload;
}