import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

/**
 * Authenticates and authorizes a seller based on JWT token and seller account status.
 *
 * @param request HTTP request containing the Authorization header
 * @returns Validated SellerPayload upon success
 * @throws ForbiddenException or UnauthorizedException for invalid/unauthorized actors
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
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: payload.id,
      status: "approved",
      is_email_verified: true
    }
  });
  if (seller === null) {
    throw new ForbiddenException("You're not enrolled or your seller account is not approved/verified.");
  }
  return payload;
}
