import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";

export async function guestAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestPayload> {
  try {
    const payload = jwtAuthorize({ request }) as GuestPayload;

    if (payload.type !== "guest") {
      throw new ForbiddenException(`You're not ${payload.type}`);
    }

    return payload;
  } catch (e: unknown) {
    if (e instanceof ForbiddenException) throw e;
    if (e instanceof UnauthorizedException) throw e;

    const message = e instanceof Error ? e.message : "Unauthorized";
    throw new UnauthorizedException(message);
  }
}
