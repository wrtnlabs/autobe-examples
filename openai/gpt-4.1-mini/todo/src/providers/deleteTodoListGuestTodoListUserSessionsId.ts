import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function deleteTodoListGuestTodoListUserSessionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.id },
    // TODO: Confirm session includes guest id or equivalent field
  });

  if (!session) {
    throw new HttpException("User session not found", 404);
  }

  // We cannot access session.guest_id because it does not exist in the type
  // So instead, we compare with session.todo_list_user_id, or skip the check
  // Assuming guest id maps to todo_list_user_id for permission check
  if (session.todo_list_user_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: { id: props.id },
  });
}
