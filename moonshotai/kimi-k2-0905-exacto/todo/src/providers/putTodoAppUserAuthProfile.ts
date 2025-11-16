import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserAuthProfile(props: {
  user: UserPayload;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  const updateData: {
    email?: string;
    password_hash?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };

  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }

  if (props.body.password_hash !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(
      props.body.password_hash,
    );
  }

  const updated = await MyGlobal.prisma.todo_app_users.update({
    where: { id: props.user.id },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
