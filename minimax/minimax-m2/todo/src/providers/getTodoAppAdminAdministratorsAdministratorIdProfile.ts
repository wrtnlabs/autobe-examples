import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminAdministratorsAdministratorIdProfile(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdministrator> {
  // Validate administrator exists and is not soft-deleted
  const administrator = await MyGlobal.prisma.todo_app_administrators.findFirst(
    {
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
    },
  );

  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }

  // Return comprehensive administrator profile information
  return {
    id: administrator.id,
    email: administrator.email,
    first_name: administrator.first_name ?? null,
    last_name: administrator.last_name ?? null,
    role_level: administrator.role_level,
    status: administrator.status,
    created_at: toISOStringSafe(administrator.created_at),
    updated_at: toISOStringSafe(administrator.updated_at),
    deleted_at: administrator.deleted_at
      ? toISOStringSafe(administrator.deleted_at)
      : undefined,
  };
}
