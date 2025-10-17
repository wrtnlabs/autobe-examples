import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getTodoListSystemAdminSystemAdminsSystemAdminId(props: {
  systemAdmin: SystemadminPayload;
  systemAdminId: string & tags.Format<"uuid">;
}): Promise<ITodoListSystemAdmin> {
  const { systemAdmin, systemAdminId } = props;

  // Authorization: ensure caller is a system admin
  if (systemAdmin.type !== "systemadmin") {
    throw new HttpException("Forbidden", 403);
  }

  const row = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: {
      id: systemAdminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (row === null) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id,
    email: row.email,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}
