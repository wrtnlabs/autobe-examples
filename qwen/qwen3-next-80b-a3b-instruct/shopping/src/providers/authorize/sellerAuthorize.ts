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

  // payload.id contains top-level user table ID
  // Query directly against seller table since it's the primary identity model
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (seller === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}