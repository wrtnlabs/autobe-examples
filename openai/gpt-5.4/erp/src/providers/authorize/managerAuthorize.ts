import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { ManagerPayload } from "../../decorators/payload/ManagerPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function managerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<ManagerPayload> {
  const payload: ManagerPayload = jwtAuthorize({ request }) as ManagerPayload;

  if (payload.type !== "manager") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const manager = await MyGlobal.prisma.hrm_time_tracking_managers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (manager === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findFirst({
    where: {
      id: payload.session_id,
      hrm_time_tracking_manager_id: payload.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid session");
  }

  return payload;
}
