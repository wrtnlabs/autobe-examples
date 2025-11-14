import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CitizenPayload } from "../../decorators/payload/CitizenPayload";

export async function citizenAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<CitizenPayload> {
  const payload: CitizenPayload = jwtAuthorize({ request }) as CitizenPayload;

  if (payload.type !== "citizen") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using foreign key relationship from citizen_sessions to political_forum_citizens
  const citizen = await MyGlobal.prisma.political_forum_citizens.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      email_verified: true,
    },
  });

  if (citizen === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}