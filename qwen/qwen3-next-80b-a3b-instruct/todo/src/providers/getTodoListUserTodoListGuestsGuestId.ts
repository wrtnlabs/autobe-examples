import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function getTodoListUserTodoListGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoListGuest> {
  const guest = await MyGlobal.prisma.todo_list_guest.findUnique({
    where: { id: props.guestId, deleted_at: null },
  });

  if (!guest) {
    throw new HttpException("Guest registration not found", 404);
  }

  return {
    email: guest.email,
  };
}
