import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← Same directory!
import { SuperadministratorPayload } from "../../decorators/payload/SuperadministratorPayload";

export async function superadministratorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<SuperadministratorPayload> {
  const payload: SuperadministratorPayload = jwtAuthorize({ request }) as SuperadministratorPayload;

  if (payload.type !== "superadministrator") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using appropriate field based on schema
  // superAdministrator is a standalone actor table with direct id reference
  const superAdmin = await MyGlobal.prisma.economic_board_super_administrators.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (superAdmin === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}