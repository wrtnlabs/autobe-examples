import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { OwnerPayload } from "../../decorators/payload/OwnerPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function ownerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<OwnerPayload> {
  const payload = jwtAuthorize({ request }) as OwnerPayload;

  if (payload.type !== "owner") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirst({
    where: {
      id: payload.session_id,
      hrm_time_tracking_owner_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
      owner: {
        deleted_at: null,
        deactivated_at: null,
      },
    },
  });

  if (session === null) {
    throw new UnauthorizedException("Expired or invalid session");
  }

  const owner = await MyGlobal.prisma.hrm_time_tracking_owners.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      deactivated_at: null,
    },
  });

  if (owner === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
