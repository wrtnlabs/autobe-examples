import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListGuestsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const guest = await MyGlobal.prisma.todo_list_guests.findUnique({
    where: { id: props.id },
  });

  if (guest === null) {
    throw new HttpException("Guest user not found", 404);
  }

  await MyGlobal.prisma.todo_list_guests.delete({
    where: { id: props.id },
  });
}
