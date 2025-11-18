import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function getTodoAppGuestUserGuestUsersGuestUserId(props: {
  guestUser: GuestuserPayload;
  guestUserId: string;
}): Promise<ITodoAppGuestUser> {
  const guest = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: props.guestUserId,
    },
  });

  if (guest === null) {
    throw new HttpException("Guest user not found", 404);
  }

  return {
    id: guest.id,
    display_name: guest.display_name === null ? null : guest.display_name,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
  };
}
