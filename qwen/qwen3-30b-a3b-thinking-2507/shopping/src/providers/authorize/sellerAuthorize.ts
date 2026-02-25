import { ForbiddenException  from "@nestjs/common";
import { MyGlobal  from "../../MyGlobal";
import { jwtAuthorize  from "./jwtAuthorize";
import { SellerPayload  from "../../decorators/payload/SellerPayload";

export async function sellerAuthorize(request: {
  headers: { authorization?: string ;
}): Promise<SellerPayload> {
  const payload: SellerPayload = jwtAuthorize({ request }) as SellerPayload;

  if (payload.type !== "seller") {
    throw new ForbiddenException(`You're not a seller`);
  }

  const seller = await MyGlobal.prisma.ecommerce_sellers.findFirst({
    where: {
      id: payload.id,
      status: "approved",
      deleted_at: null,
    },
  });

  if (seller === null) {
    throw new ForbiddenException("Seller account not approved or not found");
  }

  return payload;
}
