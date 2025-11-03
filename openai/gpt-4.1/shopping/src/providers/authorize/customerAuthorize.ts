import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

/**
 * JWT-based authentication provider for Customer role.
 *
 * - Verifies the Bearer token using jwtAuthorize
 * - Enforces payload.type === "customer"
 * - Checks existence and active status of shopping_customers
 * - Returns the strongly-typed CustomerPayload
 */
export async function customerAuthorize(request: {
  headers: { authorization?: string }
}): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;
  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // Check that customer exists and account is active and not deleted
  const customer = await MyGlobal.prisma.shopping_customers.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      deleted_at: null
    },
  });
  if (customer === null) {
    throw new ForbiddenException("You're not enrolled or account is inactive/deleted");
  }
  return payload;
}
