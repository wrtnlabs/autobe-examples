import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postTodoAppMemberUserTodos(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // 1. Ensure the member user account exists and is active / not deleted
  const memberUserRecord = await MyGlobal.prisma.todo_app_memberusers.findFirst(
    {
      where: {
        id: props.memberUser.id,
        deleted_at: null,
      },
    },
  );

  if (memberUserRecord === null) {
    throw new HttpException("Member user not found or inactive", 403);
  }

  if (memberUserRecord.status !== "active") {
    throw new HttpException("Member user is not active", 403);
  }

  const now = new Date();

  // 2. Create the todo record for this member user
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: v4(),
      todo_app_memberuser_id: props.memberUser.id,
      title: props.body.title,
      description:
        props.body.description === undefined ? null : props.body.description,
      status: "pending",
      created_at: now,
      updated_at: now,
      completed_at: null,
      deleted_at: null,
    },
  });

  // 3. Map DB entity to ITodoAppMemberuser.ISummary using the already loaded memberUserRecord
  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: memberUserRecord.id as string & tags.Format<"uuid">,
    email: memberUserRecord.email as string & tags.Format<"email">,
    display_name:
      memberUserRecord.display_name === null
        ? null
        : memberUserRecord.display_name,
    status: memberUserRecord.status,
    last_login_at:
      memberUserRecord.last_login_at === null
        ? null
        : toISOStringSafe(memberUserRecord.last_login_at),
  };

  // 4. Map DB entity to ITodoAppTodo DTO
  const result: ITodoAppTodo = {
    id: created.id as string & tags.Format<"uuid">,
    memberUser: memberUserSummary,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    status: created.status,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    completed_at:
      created.completed_at === null
        ? undefined
        : (toISOStringSafe(created.completed_at) as string &
            tags.Format<"date-time">),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : (toISOStringSafe(created.deleted_at) as string &
            tags.Format<"date-time">),
  };

  return result;
}
