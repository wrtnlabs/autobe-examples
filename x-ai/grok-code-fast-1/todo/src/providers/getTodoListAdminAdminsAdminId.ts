import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
}): Promise<ITodoListAdmin> {
  const adminRecord = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Administrator not found", 404);
  }

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    display_name: adminRecord.display_name,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at:
      adminRecord.deleted_at !== null
        ? toISOStringSafe(adminRecord.deleted_at)
        : undefined,
  };
}
