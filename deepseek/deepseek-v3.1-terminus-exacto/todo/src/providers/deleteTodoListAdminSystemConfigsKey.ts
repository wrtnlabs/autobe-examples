import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminSystemConfigsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<void> {
  // Confirm existence and not soft-deleted
  const config = await MyGlobal.prisma.todo_list_system_configs.findFirst({
    where: {
      key: props.key,
      deleted_at: null,
    },
  });

  if (!config) {
    throw new HttpException("Configuration not found or already deleted.", 404);
  }

  // Perform hard deletion
  await MyGlobal.prisma.todo_list_system_configs.delete({
    where: { key: props.key },
  });
}
