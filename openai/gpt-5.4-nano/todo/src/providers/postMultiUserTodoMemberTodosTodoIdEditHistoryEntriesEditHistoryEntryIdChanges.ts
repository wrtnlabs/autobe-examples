import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postMultiUserTodoMemberTodosTodoIdEditHistoryEntriesEditHistoryEntryIdChanges(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryEntryId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistoryEntryChange.ICreate;
}): Promise<IMultiUserTodoEditHistoryEntryChange> {
  const { member, todoId, editHistoryEntryId, body } = props;
  if (!member?.id) {
    throw new HttpException("Unauthorized", 401);
  }
  const prisma = MyGlobal.prisma;
  const created = await (
    prisma as unknown as Record<
      string,
      {
        create: (args: unknown) => Promise<unknown>;
      }
    >
  )["multi_user_todo_edit_history_entry_changes"].create({
    data: {
      member_id: member.id,
      todo_id: todoId,
      edit_history_entry_id: editHistoryEntryId,
      ...(body as unknown as Record<string, unknown>),
    },
  });
  const dto: IMultiUserTodoEditHistoryEntryChange =
    created as IMultiUserTodoEditHistoryEntryChange;
  for (const key of Object.keys(dto) as Array<
    keyof IMultiUserTodoEditHistoryEntryChange
  >) {
    const value = (dto as unknown as Record<string, unknown>)[key as string];
    if (value instanceof Date) {
      (dto as unknown as Record<string, unknown>)[key as string] =
        toISOStringSafe(value);
    }
  }
  return dto;
}
