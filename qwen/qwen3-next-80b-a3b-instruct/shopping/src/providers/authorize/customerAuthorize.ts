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

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: payload.id,
      status: "active",
      deleted_at: null,
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}