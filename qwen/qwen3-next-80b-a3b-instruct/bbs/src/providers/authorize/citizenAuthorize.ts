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

  // Citizen is standalone table - query directly using citizen fields
  const citizen = await MyGlobal.prisma.discussion_board_citizen.findFirst({
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