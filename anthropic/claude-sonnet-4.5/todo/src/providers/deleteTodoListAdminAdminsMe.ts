import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsMe(props: {
  admin: AdminPayload;
}): Promise<void> {
  const { admin } = props;

  await MyGlobal.prisma.todo_list_admins.update({
    where: {
      id: admin.id,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
