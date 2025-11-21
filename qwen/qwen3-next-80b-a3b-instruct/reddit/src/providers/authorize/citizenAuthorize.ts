import { ForbiddenException } from "@nestjs/common";

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

  // Query citizen table using top-level user ID with soft-delete validation
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (citizen === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}