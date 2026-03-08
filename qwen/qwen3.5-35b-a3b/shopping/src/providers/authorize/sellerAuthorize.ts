import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
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

  try {
    const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
      where: {
        id: payload.id,
        deleted_at: null,
        approval_status: "approved",
        is_banned: false,
      },
    });

    if (seller === null) {
      throw new ForbiddenException("You're not enrolled");
    }

    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException("Authentication failed");
  }
}