import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TodoadminPayload } from "../../decorators/payload/TodoadminPayload";

/**
 * Authorize a todo admin actor based on a JWT bearer token.
 *
 * This function verifies the JWT, enforces the `todoAdmin` role discriminator,
 * and validates that there is an active admin session bound to the
 * top-level admin account referenced by the payload.
 */
export async function todoadminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TodoadminPayload> {
  const payload: TodoadminPayload = jwtAuthorize({ request }) as TodoadminPayload;

  if (payload.type !== "todoAdmin") {
    throw new ForbiddenException("You're not todoAdmin");
  }

  // payload.id contains top-level admin table ID: todo_app_todoadmins.id
  // payload.session_id contains todo_app_todoadmin_sessions.id
  const session = await MyGlobal.prisma.todo_app_todoadmin_sessions.findFirst({
    where: {
      id: payload.session_id,
      todoAdmin: {
        id: payload.id,
        status: "active",
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
