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

export async function getTodoAppAdministratorsAdministratorId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<ITodoAppAdministrator.ISummary> {
  // Verify admin authorization is valid
  if (props.admin.type !== "admin") {
    throw new HttpException("Unauthorized", 403);
  }

  // Find administrator by ID, excluding soft deleted records
  const administrator = await MyGlobal.prisma.todo_app_administrators.findFirst(
    {
      where: {
        id: props.administratorId,
        deleted_at: null, // Exclude soft deleted records
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role_level: true,
        created_at: true,
      },
    },
  );

  if (!administrator) {
    throw new HttpException("Administrator not found", 404);
  }

  // Return administrator summary excluding sensitive fields
  return {
    id: administrator.id,
    email: administrator.email,
    first_name: administrator.first_name ?? "",
    last_name: administrator.last_name ?? "",
    role_level: administrator.role_level,
    created_at: toISOStringSafe(administrator.created_at),
  };
}
