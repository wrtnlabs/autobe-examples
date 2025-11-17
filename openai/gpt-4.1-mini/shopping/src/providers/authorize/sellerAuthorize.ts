import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: { headers: { authorization?: string } }): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst({
    where: {
      id: payload.session_id,
      shoppingMallSeller: {
        id: payload.id
      },
      expired_at: null
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session is invalid or expired, or seller does not exist");
  }

  return payload;
}
