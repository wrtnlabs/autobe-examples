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

export async function deleteTodoAppMemberUsersMe(props: {
  member: MemberPayload;
}): Promise<void> {
  const userId = props.member.id;
  const sessionId = props.member.session_id;
  // Permanently delete all edit history entries associated with user's todos
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all todo IDs owned by the user
    const userTodos = await tx.todo_app_todos.findMany({
      where: {
        todo_app_user_id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });
    const todoIds = userTodos.map((todo) => todo.id);
    // Delete all edit history entries (via edit history entries -> edit -> todo)
    if (todoIds.length > 0) {
      await tx.$executeRaw`
        DELETE FROM todo_app_edit_history_entries
        WHERE todo_app_todo_edit_id IN (
          SELECT id FROM todo_app_todo_edits WHERE todo_id IN (${Prisma.join(todoIds)})
        )
      `;
      // Delete all todo edits
      await tx.todo_app_todo_edits.deleteMany({
        where: { todo_id: { in: todoIds } },
      });
    }
    // Delete all todos (including trash)
    await tx.todo_app_todos.deleteMany({
      where: { todo_app_user_id: userId },
    });
    // Delete user's profile
    await tx.todo_app_profiles.delete({
      where: { todo_app_user_id: userId },
    });
    // Delete user account
    await tx.todo_app_users.delete({
      where: { id: userId },
    });
  });
  // Invalidate all active sessions for the user
  // Delete all member sessions for the user (access and refresh tokens)
  await MyGlobal.prisma.todo_app_member_sessions.deleteMany({
    where: { todo_app_member_id: userId },
  });
  // Return 204 No Content (void)
}
