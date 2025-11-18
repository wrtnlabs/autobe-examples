import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListTodoListGuestsGuestId(props: {
  user: UserPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const guest = await MyGlobal.prisma.todo_list_guest.findUnique({
    where: { id: props.guestId },
  });

  if (!guest) {
    throw new HttpException("Guest registration not found", 404);
  }

  await MyGlobal.prisma.todo_list_guest.delete({
    where: { id: props.guestId },
  });
}
