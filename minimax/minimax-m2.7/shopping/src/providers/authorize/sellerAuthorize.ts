import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.ecommerce_mall_seller_sessions.findFirst({
    where: {
      id: payload.session_id,
      ecommerce_mall_seller_id: payload.id,
      expired_at: { gt: new Date() },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired");
  }

  return payload;
}