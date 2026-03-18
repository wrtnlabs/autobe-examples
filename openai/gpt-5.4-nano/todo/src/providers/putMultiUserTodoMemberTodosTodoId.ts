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

export async function putMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistoryEntry.IUpdate;
}): Promise<IMultiUserTodoEditHistoryEntry> {
  const { member, todoId, body } = props;
  const db = MyGlobal.prisma;
  const memberId = (
    member as unknown as {
      member_id: string;
    }
  ).member_id;
  const exists = await (
    db as unknown as {
      multi_user_todo: {
        findFirst: (args: {
          where: {
            id: string;
            member_id: string;
          };
          select: {
            id: true;
          };
        }) => Promise<unknown>;
      };
    }
  ).multi_user_todo.findFirst({
    where: {
      id: todoId as string,
      member_id: memberId,
    },
    select: { id: true },
  });
  if (!exists) throw new HttpException("not found", 404);
  const createdAt = toISOStringSafe(new Date());
  const safeBody = body as unknown as {
    change?: Record<string, unknown> | null;
    created_at?: Date | string | null;
  };
  const changeCreatedAt =
    safeBody.created_at === null || safeBody.created_at === undefined
      ? createdAt
      : toISOStringSafe(safeBody.created_at as unknown as Date);
  const updated = await (
    db as unknown as {
      multi_user_todo_edit_history_entry: {
        create: (args: { data: unknown }) => Promise<unknown>;
      };
    }
  ).multi_user_todo_edit_history_entry.create({
    data: {
      todo_id: todoId as string,
      member_id: memberId,
      change: {
        create: {
          ...(safeBody.change ?? undefined),
          created_at: changeCreatedAt,
        },
      },
      created_at: createdAt,
    } as never,
  });
  return updated as unknown as IMultiUserTodoEditHistoryEntry;
}
