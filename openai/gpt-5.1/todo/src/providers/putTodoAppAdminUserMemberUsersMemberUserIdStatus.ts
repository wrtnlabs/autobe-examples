import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserStatus";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putTodoAppAdminUserMemberUsersMemberUserIdStatus(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: ITodoAppMemberUserStatus.IUpdate;
}): Promise<ITodoAppMemberUser> {
  const existing = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Member user not found", 404);
  }

  const allowedStatuses = ["active", "blocked", "disabled"];
  const nextStatus = props.body.status;

  if (!allowedStatuses.includes(nextStatus)) {
    throw new HttpException("Status value is not allowed", 400);
  }

  const updated = await MyGlobal.prisma.todo_app_memberusers.update({
    where: {
      id: props.memberUserId,
    },
    data: {
      status: nextStatus,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name:
      updated.display_name === null ? undefined : updated.display_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
