import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: { headers: { authorization?: string } }): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findFirst({
    where: {
      id: payload.session_id,
      econ_pol_discussion_board_guest_id: payload.id,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session invalid");
  }

  return payload;
}
