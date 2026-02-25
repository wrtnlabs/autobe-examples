import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperAdminPayload } from "../../decorators/payload/SuperAdminPayload";

export async function superAdminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperAdminPayload> {
  const payload: SuperAdminPayload = jwtAuthorize({ request }) as SuperAdminPayload;

  if (payload.type !== "superadmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query super_admin table directly since it's a standalone actor
  const superadmin = await MyGlobal.prisma.discussion_board_super_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Soft-delete check
    },
  });

  if (superadmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}