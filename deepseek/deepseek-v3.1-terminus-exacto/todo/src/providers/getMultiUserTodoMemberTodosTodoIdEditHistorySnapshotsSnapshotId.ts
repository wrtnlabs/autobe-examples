import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoEditHistorySnapshotTransformer } from "../transformers/MultiUserTodoEditHistorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdEditHistorySnapshotsSnapshotId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoEditHistorySnapshot> {
  // First verify the todo belongs to the member
  await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      member: { id: props.member.id },
      deleted_at: null, // Only active todos can have accessible snapshots
    },
  });
  // Get the specific snapshot for this todo
  const snapshot =
    await MyGlobal.prisma.multi_user_todo_edit_history_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          multi_user_todo_todo_id: props.todoId,
        },
        ...MultiUserTodoEditHistorySnapshotTransformer.select(),
      },
    );
  return await MultiUserTodoEditHistorySnapshotTransformer.transform(snapshot);
}
