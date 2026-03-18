import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const prismaTx = tx as unknown as {
      multi_user_todos: {
        findUnique: (args: any) => Promise<null | {
          id: string;
          multi_user_todo_member_id: string;
          deleted_at: string | null;
        }>;
        update: (args: any) => Promise<any>;
      };
    };
    const todo = await prismaTx.multi_user_todos.findUnique({
      where: { id: props.todoId },
      select: {
        id: true,
        multi_user_todo_member_id: true,
        deleted_at: true,
      },
    });
    const isOwned =
      todo !== null && todo.multi_user_todo_member_id === props.member.id;
    if (!isOwned) {
      throw new HttpException("The todo is not available", 404);
    }
    if (todo !== null && todo.deleted_at !== null) {
      return;
    }
    const now = toISOStringSafe(new Date());
    await prismaTx.multi_user_todos.update({
      where: { id: props.todoId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
