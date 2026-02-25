import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegistereduserPayload } from "../../decorators/payload/RegistereduserPayload";

export async function registereduserAuthorize(request: { headers: { authorization?: string } }): Promise<RegistereduserPayload> {
  const payload = jwtAuthorize({ request }) as RegistereduserPayload;

  if (payload.type !== "registereduser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Corrected prisma client property to likely correct table name with camelCase
  const registeredUser = await MyGlobal.prisma.registered_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });

  if (!registeredUser) {
    throw new ForbiddenException("You're not enrolled or inactive");
  }

  return payload;
}