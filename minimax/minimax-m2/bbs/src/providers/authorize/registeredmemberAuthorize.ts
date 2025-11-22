import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegisteredmemberPayload } from "../../decorators/payload/RegisteredmemberPayload";

export async function registeredmemberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<RegisteredmemberPayload> {
  const payload: RegisteredmemberPayload = jwtAuthorize({ request }) as RegisteredmemberPayload;

  if (payload.type !== "registeredmember") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query using primary key since this is a standalone user table
  const user = await MyGlobal.prisma.econ_political_discussion_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}