import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminTodoListSystemConfigurationsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.todo_list_system_configurations.findUnique({
      where: { key: props.key },
    });
  if (existing === null) {
    throw new HttpException("System configuration entry not found", 404);
  }

  await MyGlobal.prisma.todo_list_system_configurations.delete({
    where: { key: props.key },
  });
}
