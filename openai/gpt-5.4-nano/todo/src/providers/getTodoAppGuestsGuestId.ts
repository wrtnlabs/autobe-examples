import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuest> {
  const guest = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    select: {
      id: true,
      device_identifier: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: guest.id,
    device_identifier: guest.device_identifier,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
