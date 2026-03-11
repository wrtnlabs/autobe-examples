import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoSnapshotTransformer } from "../transformers/MultiUserTodoTodoSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoSnapshot> {
  // Verify member owns the parent todo
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { multi_user_todo_member_id: true },
  });
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden: You do not own this todo", 403);
  }
  // Retrieve the snapshot with proper ownership validation
  const snapshot =
    await MyGlobal.prisma.multi_user_todo_todo_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        multi_user_todo_todo_id: props.todoId,
      },
      ...MultiUserTodoTodoSnapshotTransformer.select(),
    });
  return await MultiUserTodoTodoSnapshotTransformer.transform(snapshot);
}
