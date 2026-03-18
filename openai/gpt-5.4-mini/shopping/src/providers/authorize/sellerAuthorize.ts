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
  } catch {
    throw new UnauthorizedException("Invalid authorization token");
  }

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { id: payload.id },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}