import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { MultiUserTodoTodoTrashEntryTransformer } from "../transformers/MultiUserTodoTodoTrashEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTrashEntriesTrashEntryId(props: {
  member: MemberPayload;
  trashEntryId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoTrashEntry> {
  // First verify ownership by checking trash entry exists and member owns the associated todo
  const ownershipCheck =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findUniqueOrThrow({
      where: { id: props.trashEntryId },
      select: {
        id: true,
        todo: {
          select: {
            multi_user_todo_member_id: true,
          },
        } satisfies Prisma.multi_user_todo_todosFindManyArgs,
      },
    });
  if (ownershipCheck.todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Then fetch full details using the transformer
  const trashEntry =
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.findUniqueOrThrow({
      where: { id: props.trashEntryId },
      ...MultiUserTodoTodoTrashEntryTransformer.select(),
    });
  return await MultiUserTodoTodoTrashEntryTransformer.transform(trashEntry);
}
