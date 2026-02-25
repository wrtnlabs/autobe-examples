import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdministratorPayload } from "../../decorators/payload/AdministratorPayload";

export async function administratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdministratorPayload> {
  const payload: AdministratorPayload = jwtAuthorize({ request }) as AdministratorPayload;

  if (payload.type !== "administrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const administrator = await MyGlobal.prisma.economic_board_administrators.findFirst({
    where: {
      id: payload.id,
      is_banned: false,
    },
  });

  if (administrator === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}