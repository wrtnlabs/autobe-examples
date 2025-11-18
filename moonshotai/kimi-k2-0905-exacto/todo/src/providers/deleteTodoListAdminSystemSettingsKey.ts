import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_list_system_settings.findUnique({
    where: { key: props.key },
  });
  if (!existing) {
    throw new HttpException(
      `System setting with key 'fprops.keyf' not found.`,
      404,
    );
  }
  await MyGlobal.prisma.todo_list_system_settings.delete({
    where: { key: props.key },
  });
}
