import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string;
}): Promise<void> {
  // Locate the target member user by primary key
  const existingMemberUser =
    await MyGlobal.prisma.todo_app_memberusers.findUnique({
      where: {
        id: props.memberUserId,
      },
    });

  if (existingMemberUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Perform hard delete of the member user record
  await MyGlobal.prisma.todo_app_memberusers.delete({
    where: {
      id: props.memberUserId,
    },
  });

  // No return value needed (Promise<void>)
}
