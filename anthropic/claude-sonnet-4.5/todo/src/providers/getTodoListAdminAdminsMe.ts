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

export async function getTodoListAdminAdminsMe(props: {
  admin: AdminPayload;
}): Promise<ITodoListAdmin> {
  const { admin } = props;

  const adminRecord = await MyGlobal.prisma.todo_list_admins.findUniqueOrThrow({
    where: { id: admin.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: adminRecord.id as string & tags.Format<"uuid">,
    email: adminRecord.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at: adminRecord.deleted_at
      ? toISOStringSafe(adminRecord.deleted_at)
      : undefined,
  };
}
