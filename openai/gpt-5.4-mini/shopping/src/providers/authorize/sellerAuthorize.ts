import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SellerPayload> {
  let payload: SellerPayload;

  try {
    payload = jwtAuthorize({ request }) as SellerPayload;
  } catch (error) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException("Invalid authentication token");
  }

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const seller = await MyGlobal.prisma.mall_platform_sellers.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.mall_platform_seller_sessions.findFirst({
    where: {
      id: payload.session_id,
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Your session is not found");
  }

  return payload;
}