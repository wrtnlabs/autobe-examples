import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
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

export async function getMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoEditHistoryEntry> {
  const entry =
    await MyGlobal.prisma.multi_user_todo_edit_history_entries.findFirstOrThrow(
      {
        where: {
          multi_user_todo_id: props.todoId,
          deleted_at: null,
        },
        select: {
          id: true,
          edited_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          changes: {
            select: {
              id: true,
              changed_field: true,
              from_value: true,
              to_value: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    );
  return {
    id: entry.id as string & tags.Format<"uuid">,
    editedAt: entry.edited_at.toISOString() as string &
      tags.Format<"date-time">,
    createdAt: entry.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: entry.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deletedAt: entry.deleted_at?.toISOString() ?? null,
    changes: entry.changes.map(
      (c): IMultiUserTodoEditHistoryEntry["changes"][number] => ({
        id: c.id as unknown as null,
        changedField: c.changed_field as unknown as null,
        fromValue: c.from_value as unknown as null,
        toValue: c.to_value as unknown as null,
        createdAt: c.created_at.toISOString() as unknown as null,
        updatedAt: c.updated_at.toISOString() as unknown as null,
        deletedAt: null,
      }),
    ),
  };
}
