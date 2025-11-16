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
  guestUserId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuestUser> {
  // Authorization: a guestUser can only read its own identity record
  if (props.guestUser.id !== props.guestUserId) {
    throw new HttpException(
      "Forbidden to access other guest user identities",
      403,
    );
  }

  // Fetch the guest user record by primary key
  const record = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: props.guestUserId,
    },
  });

  if (record === null) {
    throw new HttpException("Guest user identity not found", 404);
  }

  // Map database record to ITodoAppGuestUser DTO
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    record.created_at,
  );
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    record.updated_at,
  );

  const dto: ITodoAppGuestUser = {
    id: record.id,
    external_reference: record.external_reference,
    display_name: record.display_name,
    status: record.status,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  return dto;
}
