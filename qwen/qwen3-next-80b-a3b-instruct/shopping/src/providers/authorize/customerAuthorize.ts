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

  // Query directly by id since customer is standalone actor (no User inheritance)
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Soft-delete check
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}