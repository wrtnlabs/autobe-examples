import { ForbiddenException } from "@nestjs/common";
import { jwtAuthorize } from "./jwtAuthorize";
import { GuestPayload } from "../../decorators/payload/GuestPayload";
import { MyGlobal } from "../../MyGlobal";

export async function guestAuthorize(request: { headers: { authorization?: string } }): Promise<GuestPayload> {
  const payload: GuestPayload = jwtAuthorize({ request }) as GuestPayload;

  if (payload.type !== "guest") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on Prisma Schema (todo_list_users table)
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
