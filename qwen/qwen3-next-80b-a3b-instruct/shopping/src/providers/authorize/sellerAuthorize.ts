import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query seller_sessions to verify active session and link to seller
  // seller_sessions has seller_id foreign key to shopping_mall_sellers
  const sellerSession = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst({
    where: {
      id: payload.session_id,
      seller: {
        id: payload.id,
        deleted_at: null,  // Soft-delete validation
        is_suspended: false,  // Corrected field name
      },
      expired_at: { gt: new Date() },  // Session expiration validation
    },
    include: {
      seller: true,
    },
  });

  if (sellerSession === null) {
    throw new ForbiddenException("You're not enrolled or your session has expired");
  }

  return payload;
}