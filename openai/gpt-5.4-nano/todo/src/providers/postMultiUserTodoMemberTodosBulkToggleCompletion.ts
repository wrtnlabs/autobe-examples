import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodosBulkToggleCompletion(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoEditHistoryEntry.IRequest;
}): Promise<IMultiUserTodoTodoEditHistoryEntry.ISummary> {
  const todoIds = props.body.todoIds;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const resolved = await tx.multi_user_todo_todos.findMany({
      where: {
        id: { in: todoIds },
        deleted_at: null,
      },
      select: {
        id: true,
        is_complete: true,
        updated_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        lifecycle_state: true,
        created_at: true,
        deleted_at: true,
      },
      orderBy: { id: "asc" },
    });
    if (resolved.length !== todoIds.length) {
      throw new HttpException("Forbidden", 403);
    }
    const updatedAtValue = resolved[0].updated_at;
    for (const todo of resolved) {
      await tx.multi_user_todo_todos.update({
        where: { id: todo.id },
        data: {
          is_complete: !todo.is_complete,
          updated_at: updatedAtValue,
        },
      });
    }
    const firstUpdated = await tx.multi_user_todo_todos.findFirstOrThrow({
      where: {
        id: { in: todoIds },
        deleted_at: null,
      },
      ...MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer.select(),
      orderBy: { id: "asc" },
    });
    return await MultiUserTodoTodoEditHistoryEntryAtSummaryTransformer.transform(
      firstUpdated,
    );
  });
}
