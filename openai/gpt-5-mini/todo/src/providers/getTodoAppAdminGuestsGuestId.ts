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

  // Strict UUID v4 format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(guestId)) {
    throw new HttpException("Bad Request: Invalid UUID", 400);
  }

  try {
    const guest = await MyGlobal.prisma.todo_app_guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) throw new HttpException("Not Found", 404);

    const auditCreatedAt = toISOStringSafe(new Date());

    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "read_guest",
        target_resource: "guest",
        target_id: guestId,
        reason: null,
        created_at: auditCreatedAt,
      },
    });

    return {
      id: guest.id as string & tags.Format<"uuid">,
      email: guest.email ?? null,
      created_at: toISOStringSafe(guest.created_at),
      last_active_at: guest.last_active_at
        ? toISOStringSafe(guest.last_active_at)
        : null,
      status: guest.status ?? null,
    };
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
