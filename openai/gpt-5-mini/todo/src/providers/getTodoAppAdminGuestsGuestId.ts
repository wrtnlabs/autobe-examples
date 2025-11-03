import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuest> {
  const { admin, guestId } = props;

  // Authorization: admin actor must be present and of correct type
  if (!admin || admin.type !== "admin") {
    throw new HttpException("Unauthorized", 401);
  }

  const guest = await MyGlobal.prisma.todo_app_guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      anonymous_label: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!guest) throw new HttpException("Not Found", 404);

  return {
    id: guest.id,
    anonymousLabel:
      guest.anonymous_label === null ? undefined : guest.anonymous_label,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
