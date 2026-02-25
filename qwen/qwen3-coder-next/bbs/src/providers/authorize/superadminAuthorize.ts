import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "superadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using appropriate field based on schema
  const superadmin = await MyGlobal.prisma.discussion_board_super_admins.findFirst({
    where: {
      id: payload.id, // Standalone actor - direct ID lookup
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}