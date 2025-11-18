import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListTodoListGuestsGuestId(props: {
  user: UserPayload;
  guestId: string & tags.Format<"uuid">;
  body: ITodoListGuest.IUpdate;
}): Promise<ITodoListGuest> {
  const existingGuest = await MyGlobal.prisma.todo_list_guest.findUnique({
    where: {
      id: props.guestId,
      deleted_at: null,
    },
  });

  if (!existingGuest) {
    throw new HttpException(
      "Guest registration not found or already deleted",
      404,
    );
  }

  const updatedGuest = await MyGlobal.prisma.todo_list_guest.update({
    where: {
      id: props.guestId,
    },
    data: {
      email: props.body.email,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    email: updatedGuest.email,
  };
}
