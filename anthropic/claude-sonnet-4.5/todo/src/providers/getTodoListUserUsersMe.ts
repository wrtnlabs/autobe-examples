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

export async function getTodoListUserUsersMe(props: {
  user: UserPayload;
}): Promise<ITodoListUser> {
  const { user } = props;

  const account = await MyGlobal.prisma.todo_list_users.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (account.deleted_at !== null) {
    throw new HttpException(
      "Account has been deleted and cannot be accessed",
      403,
    );
  }

  return {
    id: account.id as string & tags.Format<"uuid">,
    email: account.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(account.created_at),
    updated_at: toISOStringSafe(account.updated_at),
    deleted_at: null,
  };
}
