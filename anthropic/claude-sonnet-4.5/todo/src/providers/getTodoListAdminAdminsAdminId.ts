import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<ITodoListAdmin.ISummary> {
  const targetAdmin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: {
      id: props.adminId,
    },
  });

  if (!targetAdmin) {
    throw new HttpException("Administrator not found", 404);
  }

  return {
    id: targetAdmin.id,
    email: targetAdmin.email,
    created_at: toISOStringSafe(targetAdmin.created_at),
    updated_at: toISOStringSafe(targetAdmin.updated_at),
    deleted_at: targetAdmin.deleted_at
      ? toISOStringSafe(targetAdmin.deleted_at)
      : null,
  };
}
