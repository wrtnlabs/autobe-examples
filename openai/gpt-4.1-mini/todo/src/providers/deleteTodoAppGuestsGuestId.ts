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

export async function deleteTodoAppGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: props.guestId },
  });
  if (!guest) {
    throw new HttpException("Guest user not found", 404);
  }
  await MyGlobal.prisma.todo_app_guests.delete({
    where: { id: props.guestId },
  });
}
