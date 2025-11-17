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

  // Query citizen using top-level user ID from JWT payload
  // Relationship: citizen_sessions.economic_board_citizen_id -> economic_board_citizens.id
  const citizen = await MyGlobal.prisma.economic_board_citizens.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (citizen === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}