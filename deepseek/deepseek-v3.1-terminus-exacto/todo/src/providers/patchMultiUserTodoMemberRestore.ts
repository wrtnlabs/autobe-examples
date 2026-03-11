import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberRestore(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodoTrashEntry.IRequest;
}): Promise<IMultiUserTodoTodo> {
  // First, find a trash entry that matches the request criteria and belongs to the member
  const whereClause = {
    deleted_at: {
      ...(props.body.deleted_at_start && {
        gte: new Date(props.body.deleted_at_start),
      }),
      ...(props.body.deleted_at_end && {
        lte: new Date(props.body.deleted_at_end),
      }),
    },
    restored_at: null,
    permanently_deleted_at: null,
    todo: {
      multi_user_todo_member_id: props.member.id,
    },
  } satisfies Prisma.multi_user_todo_todo_trash_entriesWhereInput;
  // Find the first matching trash entry
  const trashEntry =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findFirst({
      where: whereClause,
      include: {
        todo: {
          select: {
            id: true,
            multi_user_todo_member_id: true,
          },
        },
      },
      orderBy: { deleted_at: "desc" as const },
    });
  if (!trashEntry) {
    throw new HttpException(
      "No matching todo found in trash or already restored",
      404,
    );
  }
  // Validate that the todo belongs to the member (should already be covered by where clause)
  if (trashEntry.todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  // Transaction to update both trash entry and todo atomically
  const [updatedTrashEntry] = await MyGlobal.prisma.$transaction([
    // Update trash entry with restoration timestamp
    MyGlobal.prisma.multi_user_todo_todo_trash_entries.update({
      where: { id: trashEntry.id },
      data: {
        restored_at: now,
        updated_at: now,
      },
    }),
    // Clear deleted_at on the todo to restore it
    MyGlobal.prisma.multi_user_todo_todos.update({
      where: { id: trashEntry.multi_user_todo_todo_id },
      data: {
        deleted_at: null,
        updated_at: now,
      },
    }),
  ]);
  // Fetch the restored todo with all details
  const restoredTodo =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: trashEntry.multi_user_todo_todo_id },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(restoredTodo);
}
