import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * JWT-based authentication provider for seller actors.
 *
 * - Verifies JWT and role type
 * - Checks seller existence and status in DB
 *
 * @param request HTTP request object (with headers)
 * @returns Authenticated seller payload
 */
export async function sellerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is the top-level seller table ID
  const seller = await MyGlobal.prisma.shopping_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled or seller is not active.");
  }

  return payload;
}
