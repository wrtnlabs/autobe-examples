import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoListAdminAdminsMeSessionsRevokeAll(props: {
  admin: AdminPayload;
}): Promise<void> {
  await MyGlobal.prisma.todo_list_admin_sessions.updateMany({
    where: {
      todo_list_admin_id: props.admin.id,
      expired_at: null,
    },
    data: {
      expired_at: new Date(),
    },
  });
}
