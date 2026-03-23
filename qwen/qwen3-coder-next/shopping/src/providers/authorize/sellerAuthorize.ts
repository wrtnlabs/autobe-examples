import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new UnauthorizedException("Invalid token type");
  }

  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_suspended: false,
      approval_status: "approved",
    },
  });

  if (seller === null) {
    throw new ForbiddenException("Seller account not found or not approved");
  }

  return payload;
}