import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

export async function getTodoGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoGuest> {
  const guest = await MyGlobal.prisma.todo_guests.findUniqueOrThrow({
    where: { id: props.guestId },
  });

  return {
    id: guest.id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
