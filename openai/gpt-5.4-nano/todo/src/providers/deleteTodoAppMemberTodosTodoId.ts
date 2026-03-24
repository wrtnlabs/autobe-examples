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

export async function deleteTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      todo_app_member_id: {
        equals: props.member.id,
      },
      id: props.todoId,
    },
  });
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: { deleted_in_trash_at: { set: undefined } },
  });
}
