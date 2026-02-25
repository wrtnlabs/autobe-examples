import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadministratorPayload } from "../../decorators/payload/SuperadministratorPayload";

export async function superadministratorAuthorize(request: { headers: { authorization?: string } }): Promise<SuperadministratorPayload> {
  const payload: SuperadministratorPayload = jwtAuthorize({ request }) as SuperadministratorPayload;

  if (payload.type !== "superadministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const superadmin = await MyGlobal.prisma.discussion_board_super_administrators.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled or session invalid");
  }

  return payload;
}
