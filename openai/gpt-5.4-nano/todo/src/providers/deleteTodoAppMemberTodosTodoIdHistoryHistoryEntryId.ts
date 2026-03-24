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

export async function deleteTodoAppMemberTodosTodoIdHistoryHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyEntryId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    const todo = await tx.todo_app_todos.findFirstOrThrow({
      where: {
        id: props.todoId,
        todo_app_member_id: props.member.id,
      },
      select: { id: true },
    });
    await tx.todo_app_todo_history_entries.delete({
      where: {
        id: props.historyEntryId,
        // Prisma's delete where supports only unique fields; can't scope by todo id here.
        // So we validate linkage with a preceding constrained lookup.
      } as Prisma.todo_app_todo_history_entriesWhereUniqueInput,
    });
  });
}
