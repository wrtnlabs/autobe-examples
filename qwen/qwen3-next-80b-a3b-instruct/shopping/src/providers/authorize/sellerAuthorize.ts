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

  // seller_sessions table links to shopping_mall_sellers via seller_id
  // payload.id contains top-level user ID from shopping_mall_sellers table
  const sellerSession = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst({
    where: {
      id: payload.session_id,
      seller: {
        id: payload.id,
        deleted_at: null,
      },
    },
  });

  if (sellerSession === null) {
    throw new ForbiddenException("You're not enrolled or your account is inactive");
  }

  return payload;
}