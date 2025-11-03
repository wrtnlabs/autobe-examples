import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoAppAdminCollaborationPermissions(props: {
  admin: AdminPayload;
  body: ITodoAppCollaborationPermission.ICreate;
}): Promise<ITodoAppCollaborationPermission> {
  const { admin, body } = props;

  // Business-level uniqueness check
  const existing =
    await MyGlobal.prisma.todo_app_collaboration_permissions.findUnique({
      where: { code: body.code },
    });
  if (existing) {
    throw new HttpException("Conflict: permission code already exists", 409);
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created =
      await MyGlobal.prisma.todo_app_collaboration_permissions.create({
        data: {
          id,
          code: body.code,
          description: body.description ?? null,
          is_grantable: body.isGrantable,
          created_at: now,
          updated_at: now,
        },
      });

    // Audit log entry
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "create_collaboration_permission",
        target_type: "collaboration_permission",
        target_id: id,
        details: `Created collaboration permission: ${body.code}`,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      code: created.code,
      description: created.description ?? null,
      isGrantable: created.is_grantable,
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    // Prisma unique constraint could still throw if race condition occurs
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: permission code already exists", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
