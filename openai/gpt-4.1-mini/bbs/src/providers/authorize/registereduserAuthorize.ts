import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegistereduserPayload } from "../../decorators/payload/RegistereduserPayload";

export async function registereduserAuthorize(request: { headers: { authorization?: string } }): Promise<RegistereduserPayload> {
  const payload: RegistereduserPayload = jwtAuthorize({ request }) as RegistereduserPayload;

  if (payload.type !== "registereduser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const user = await MyGlobal.prisma.registered_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      expired_at: { gt: new Date() },
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
