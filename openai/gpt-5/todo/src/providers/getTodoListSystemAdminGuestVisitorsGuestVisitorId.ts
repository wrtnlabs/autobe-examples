import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getTodoListSystemAdminGuestVisitorsGuestVisitorId(props: {
  systemAdmin: SystemadminPayload;
  guestVisitorId: string & tags.Format<"uuid">;
}): Promise<ITodoListGuestVisitor> {
  const { systemAdmin, guestVisitorId } = props;

  // Authorization: confirm the system admin exists and is active
  const admin = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: {
      id: systemAdmin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (admin === null) throw new HttpException("Forbidden", 403);

  // Retrieve active guest visitor by id; treat soft-deleted as not found
  const guest = await MyGlobal.prisma.todo_list_guest_visitors.findFirst({
    where: {
      id: guestVisitorId,
      deleted_at: null,
    },
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (guest === null) throw new HttpException("Not Found", 404);

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  };
}
