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

export async function deleteMultiUserTodoMemberTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  await (
    MyGlobal.prisma as unknown as {
      $transaction: <T>(cb: (tx: any) => Promise<T>) => Promise<T>;
    }
  ).$transaction(async (tx) => {
    const todo = await tx.multi_user_todos.findFirstOrThrow({
      where: {
        id: props.todoId,
        multi_user_todo_member_id: props.member.id,
        deleted_at: {
          not: null,
        },
      },
      select: { id: true },
    });
    await tx.multi_user_todo_edit_history_entries.deleteMany({
      where: { multi_user_todo_id: todo.id },
    });
    await tx.multi_user_todos.delete({
      where: { id: todo.id },
    });
  });
}
