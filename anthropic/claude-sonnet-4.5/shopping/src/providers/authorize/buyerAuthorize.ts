import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { BuyerPayload } from "../../decorators/payload/BuyerPayload";

export async function buyerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<BuyerPayload> {
  const payload: BuyerPayload = jwtAuthorize({ request }) as BuyerPayload;

  if (payload.type !== "buyer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const buyer = await MyGlobal.prisma.shopping_mall_buyers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      email_verified: true,
    },
  });

  if (buyer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}