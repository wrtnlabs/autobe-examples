import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdmin> {
  const { admin, adminId } = props;

  // Ensure caller exists and is an admin
  const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (!caller) throw new HttpException("Unauthorized", 403);

  // Find target admin. Audit and return 404 if not found.
  let target;
  try {
    target = await MyGlobal.prisma.todo_app_admin.findUniqueOrThrow({
      where: { id: adminId },
    });
  } catch (err) {
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin: { connect: { id: admin.id } },
        actor_role: "admin",
        action_type: "retrieve_admin_failed",
        target_resource: "todo_app_admin",
        target_id: adminId,
        reason: "not_found",
        created_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Not Found", 404);
  }

  // Audit successful retrieval
  await MyGlobal.prisma.todo_app_audit_records.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin: { connect: { id: admin.id } },
      actor_role: "admin",
      action_type: "retrieve_admin",
      target_resource: "todo_app_admin",
      target_id: adminId,
      reason: null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: target.id as string & tags.Format<"uuid">,
    email: target.email as string & tags.Format<"email">,
    is_super: target.is_super,
    created_at: toISOStringSafe(target.created_at),
    last_active_at: target.last_active_at
      ? toISOStringSafe(target.last_active_at)
      : null,
  };
}
