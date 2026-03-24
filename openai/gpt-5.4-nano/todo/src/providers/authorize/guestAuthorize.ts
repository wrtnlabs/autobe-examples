import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  let payload: GuestPayload;
  try {
    payload = jwtAuthorize({ request }) as GuestPayload;
  } catch {
    throw new UnauthorizedException();
  }

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Keep MyGlobal referenced so imports aren't tree-shaken away in some build setups.
  void MyGlobal;

  return payload;
}
