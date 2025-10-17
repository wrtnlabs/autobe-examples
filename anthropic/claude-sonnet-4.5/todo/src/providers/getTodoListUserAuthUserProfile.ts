import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserAuthUserProfile(props: {
  user: UserPayload;
}): Promise<ITodoListUser.IProfile> {
  const { user } = props;

  const userRecord = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: user.id,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!userRecord) {
    throw new HttpException("User not found or has been deleted", 404);
  }

  return {
    id: userRecord.id as string & tags.Format<"uuid">,
    email: userRecord.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
  };
}
