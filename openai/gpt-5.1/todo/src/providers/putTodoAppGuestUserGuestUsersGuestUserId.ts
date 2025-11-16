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

export async function putTodoAppGuestUserGuestUsersGuestUserId(props: {
  guestUser: GuestuserPayload;
  guestUserId: string & tags.Format<"uuid">;
  body: ITodoAppGuestUser.IUpdate;
}): Promise<ITodoAppGuestUser> {
  // Authorization: a guest user may update only its own identity record
  if (props.guestUser.id !== props.guestUserId) {
    throw new HttpException("Forbidden", 403);
  }

  // Ensure the target guest user exists
  const existing = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: props.guestUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Guest user not found", 404);
  }

  // Build partial update payload based on provided DTO fields
  const nowIso = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_app_guestusers.update({
    where: {
      id: props.guestUserId,
    },
    data: {
      ...(props.body.external_reference !== undefined && {
        external_reference: props.body.external_reference,
      }),
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      updated_at: nowIso,
    },
  });

  return {
    id: updated.id,
    external_reference: updated.external_reference,
    display_name: updated.display_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
