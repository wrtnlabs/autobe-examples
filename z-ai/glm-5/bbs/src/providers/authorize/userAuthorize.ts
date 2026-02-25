import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: { authorization?: string };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_banned: false,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled or banned");
  }

  return payload;
}