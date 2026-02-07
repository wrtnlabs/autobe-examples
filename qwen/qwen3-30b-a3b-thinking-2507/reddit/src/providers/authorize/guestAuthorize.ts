import { UnauthorizedException  from "@nestjs/common";
import { MyGlobal  from "../../MyGlobal";
import { jwtAuthorize  from "./jwtAuthorize";
import { GuestPayload  from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string ;
}): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new UnauthorizedException(`Invalid token type: ${payload.type}`);
  }

  const guest = await MyGlobal.prisma.community_platform_guests.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });

  if (!guest) {
    throw new UnauthorizedException("Guest record not found");
  }

  return payload;
