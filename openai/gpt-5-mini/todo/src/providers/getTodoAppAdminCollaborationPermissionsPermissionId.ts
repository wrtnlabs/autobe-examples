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

export async function getTodoAppAdminCollaborationPermissionsPermissionId(props: {
  admin: AdminPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppCollaborationPermission> {
  const { admin, permissionId } = props;

  // Authorization: authenticated admin required
  if (admin.type !== "admin") {
    throw new HttpException("Unauthorized", 403);
  }

  try {
    const permission =
      await MyGlobal.prisma.todo_app_collaboration_permissions.findUnique({
        where: { id: permissionId },
      });

    if (!permission) {
      throw new HttpException("Not Found", 404);
    }

    const result: ITodoAppCollaborationPermission = {
      id: permission.id,
      code: permission.code,
      description: permission.description ?? null,
      isGrantable: permission.is_grantable,
      createdAt: toISOStringSafe(permission.created_at),
      updatedAt: toISOStringSafe(permission.updated_at),
    };

    return result;
  } catch (err) {
    if (err instanceof HttpException) throw err;
    // Unexpected errors should be masked as 500 for security
    throw new HttpException("Internal Server Error", 500);
  }
}
