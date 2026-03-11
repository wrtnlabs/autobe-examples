import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { SuperadminPayload } from "../../decorators/payload/SuperadminPayload";

export async function superadminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadminPayload> {
  const payload: SuperadminPayload = jwtAuthorize({ request }) as SuperadminPayload;

  if (payload.type !== "superAdmin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using id field (standalone actor table)
  const superAdmin = await MyGlobal.prisma.discussion_board_super_admins.findFirst({
    where: {
      id: payload.id, // Standalone actor table uses id
      deleted_at: null, // Soft-delete check
    },
  });

  if (superAdmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}