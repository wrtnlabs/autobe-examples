import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putTodoAppAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string;
  body: ITodoAppMemberUser.IUpdate;
}): Promise<ITodoAppMemberUser> {
  const existing = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: props.memberUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Member user not found", 404);
  }

  try {
    const updated = await MyGlobal.prisma.todo_app_memberusers.update({
      where: { id: props.memberUserId },
      data: {
        ...(props.body.email !== undefined && {
          email: props.body.email,
        }),
        ...(props.body.display_name !== undefined && {
          display_name: props.body.display_name,
        }),
        ...(props.body.status !== undefined && {
          status: props.body.status,
        }),
        updated_at: new Date(),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name,
      status: updated.status,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException("Email already in use", 409);
      }
    }
    throw err;
  }
}
