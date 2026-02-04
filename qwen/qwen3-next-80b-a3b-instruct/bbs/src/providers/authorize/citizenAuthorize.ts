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

  // Use 'deleted_at' for soft-delete validation since no 'status' field exists in schema
  const citizen = await MyGlobal.prisma.economic_discussion_citizens.findFirst({
    where: {
      id: payload.id,
      deleted_at: null  // Standard Prisma soft-delete field
    }
  });

  if (citizen === null) {
    throw new ForbiddenException("You're not enrolled or your account is inactive");
  }

  return payload;
}