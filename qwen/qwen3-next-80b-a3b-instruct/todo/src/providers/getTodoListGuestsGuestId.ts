import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { TodoListGuestTransformer } from "../transformers/TodoListGuestTransformer";

export async function getTodoListGuestsGuestId(props: {
  guestId: string;
}): Promise<ITodoListGuest> {
  const guest = await MyGlobal.prisma.todo_list_guest.findUnique({
    where: { id: props.guestId },
    ...TodoListGuestTransformer.select(),
  });
  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }
  return await TodoListGuestTransformer.transform(guest);
}
