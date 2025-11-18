import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const target = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!target) {
    throw new HttpException("Administrator not found", 404);
  }
  await MyGlobal.prisma.todo_list_admins.delete({
    where: { id: props.adminId },
  });
}
