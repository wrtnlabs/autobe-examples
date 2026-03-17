import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SellerPayload } from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not a seller, you're ${payload.type}`);
  }

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_banned: false,
      is_suspended: false,
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled as an active seller");
  }

  return payload;
}
